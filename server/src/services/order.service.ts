/**
 * Order read + status management. Payment/fulfilment lives in payment.service.
 */
import { Types } from 'mongoose';
import { Order, ORDER_STATUSES, type OrderStatus } from '@/models/Order.model';
import { Product } from '@/models/Product.model';
import { ApiError } from '@/utils/ApiError';
import { sendOrderStatusEmail } from '@/services/email.service';
import { logger } from '@/utils/logger';

// ---------- User ----------

export async function listUserOrders(
  userId: string,
  page = 1,
  limit = 10,
): Promise<{
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const p = Math.max(1, Number(page));
  const l = Math.min(50, Math.max(1, Number(limit)));
  const [items, total] = await Promise.all([
    Order.find({ userId }).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Order.countDocuments({ userId }),
  ]);
  return {
    items: items.map(shape),
    total,
    page: p,
    limit: l,
    pages: Math.max(1, Math.ceil(total / l)),
  };
}

export async function getUserOrderByNumber(
  userId: string,
  orderNumber: string,
): Promise<unknown> {
  const o = await Order.findOne({ userId, orderNumber }).lean();
  if (!o) throw ApiError.notFound('Order not found.');
  return shape(o);
}

/**
 * Customer-initiated order cancellation is DISABLED per business rule:
 * cancellations must go through Texlore support (email/phone). The route
 * still exists (for backwards compatibility with older clients) but always
 * returns a helpful 403 pointing the customer at the contact channel.
 *
 * Admin cancellation continues to work via `updateOrderStatus` from the
 * admin dashboard — it restores stock and emails the customer as before.
 */
export async function cancelUserOrder(
  userId: string,
  orderNumber: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _reason: string,
): Promise<unknown> {
  // Verify the order exists and belongs to the user so we don't leak
  // information about other customers' orders.
  const o = await Order.findOne({ userId, orderNumber }).lean();
  if (!o) throw ApiError.notFound('Order not found.');
  throw ApiError.forbidden(
    'Order cancellations are handled by our team. Please email texlorerugs@gmail.com with your order number and we will confirm the cancellation and initiate a refund within 72 working hours.',
  );
}

// ---------- Admin ----------

export async function listOrdersAdmin(params: {
  q?: string;
  status?: OrderStatus | 'all';
  page?: number;
  limit?: number;
  sort?: string;
  userId?: string;
}): Promise<{
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20)));
  const filter: Record<string, unknown> = {};
  if (params.status && params.status !== 'all') filter.orderStatus = params.status;
  if (params.userId && Types.ObjectId.isValid(params.userId)) filter.userId = params.userId;
  if (params.q?.trim()) {
    const rex = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { orderNumber: rex },
      { invoiceNumber: rex },
      { userEmail: rex },
      { userName: rex },
      { gatewayPaymentId: rex },
    ];
  }
  const sort = parseSort(params.sort) ?? { createdAt: -1 };
  const [items, total] = await Promise.all([
    Order.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  return {
    items: items.map(shape),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getOrderAdmin(id: string): Promise<unknown> {
  if (Types.ObjectId.isValid(id)) {
    const o = await Order.findById(id).lean();
    if (o) return shape(o);
  }
  const o2 = await Order.findOne({ orderNumber: id }).lean();
  if (!o2) throw ApiError.notFound('Order not found.');
  return shape(o2);
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  note?: string;
  trackingNumber?: string;
  courier?: string;
  actorId: string;
}): Promise<unknown> {
  if (!ORDER_STATUSES.includes(input.status)) {
    throw ApiError.badRequest('Invalid status.');
  }
  const o = Types.ObjectId.isValid(input.orderId)
    ? await Order.findById(input.orderId)
    : await Order.findOne({ orderNumber: input.orderId });
  if (!o) throw ApiError.notFound('Order not found.');

  const previous = o.orderStatus;
  o.orderStatus = input.status;
  if (input.trackingNumber !== undefined) o.trackingNumber = input.trackingNumber;
  if (input.courier !== undefined) o.courier = input.courier;
  o.timeline.push({
    at: new Date(),
    status: input.status,
    note: input.note?.slice(0, 1000) ?? '',
    actorType: 'admin',
    actorId: new Types.ObjectId(input.actorId),
  });

  // Stock restore when admin cancels/refunds a not-yet-shipped order
  if (
    (input.status === 'cancelled' || input.status === 'refunded') &&
    !o.stockRestored &&
    !['shipped', 'out_for_delivery', 'delivered'].includes(previous)
  ) {
    try {
      await Promise.allSettled(
        o.items.map((it) =>
          Product.updateOne(
            { _id: it.productId, 'sizeVariations._id': it.sizeVariationId },
            {
              $inc: {
                'sizeVariations.$.stock': it.quantity,
                totalStock: it.quantity,
              },
            },
          ),
        ),
      );
      o.stockRestored = true;
    } catch (err) {
      logger.warn('Stock restore after cancellation failed', err);
    }
  }

  if (input.status === 'cancelled') o.cancelledAt = o.cancelledAt ?? new Date();

  await o.save();

  // Notify customer for meaningful transitions
  const NOTIFY = new Set<OrderStatus>([
    'confirmed',
    'preparing',
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'returned',
    'refunded',
  ]);
  if (NOTIFY.has(input.status) && input.status !== previous) {
    void sendOrderStatusEmail(o.userEmail, {
      orderNumber: o.orderNumber,
      userName: o.userName,
      status: input.status,
      note: input.note,
      trackingNumber: o.trackingNumber,
      courier: o.courier,
    });
  }

  return shape(o.toObject() as Record<string, unknown>);
}

function shape(o: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = o as { _id: unknown } & Record<string, unknown>;
  return { id: String(_id), ...rest };
}

function parseSort(sort?: string): Record<string, 1 | -1> | null {
  if (!sort) return null;
  const out: Record<string, 1 | -1> = {};
  for (const t of sort.split(',')) {
    const [f, d] = t.split(':');
    if (!f) continue;
    out[f.trim()] = d?.trim().toLowerCase() === 'asc' ? 1 : -1;
  }
  return Object.keys(out).length ? out : null;
}
