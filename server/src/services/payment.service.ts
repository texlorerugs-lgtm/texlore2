/**
 * Payment orchestration — the STRICT flow (Part 4 rule):
 *
 *   createGatewayOrder  →  user pays via Razorpay Checkout
 *                          ↓ (client callback)
 *   verifyAndFulfil     →  HMAC signature verification
 *                          ↓ (if valid)
 *                       →  reserve stock atomically
 *                       →  create Order document
 *                       →  record coupon usage
 *                       →  clear cart
 *                       →  send confirmation emails (fire-and-forget)
 *                       →  return { order }
 *
 * NO Order document exists until the signature is verified. If any step
 * after signature-verification fails, stock changes are rolled back and
 * the payment is marked `verified` (the money is still real) so ops can
 * reconcile manually — we never lose that a real payment took place.
 *
 * The webhook handler is a redundant safety net that runs the same fulfil
 * routine idempotently. If it beats the client callback, the client just
 * finds the order already exists and returns success.
 */
import crypto from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import { razorpay } from '@/config/razorpay';
import { env } from '@/config/env';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/utils/logger';
import { Payment } from '@/models/Payment.model';
import { Order } from '@/models/Order.model';
import { Product } from '@/models/Product.model';
import { User } from '@/models/User.model';
import { Cart } from '@/models/Cart.model';
import { buildCartSnapshot } from '@/services/cart.service';
import {
  validateAndComputeCoupon,
  recordCouponUsage,
} from '@/services/coupon.service';
import {
  sendOrderConfirmationEmail,
  sendAdminOrderNotification,
} from '@/services/email.service';
import { generateInvoicePdf } from '@/services/invoice.service';
import { newInvoiceNumber, newOrderNumber } from '@/helpers/orderNumber';

const MIN_ORDER_AMOUNT_INR = 1;

interface AddressSnapshot {
  label?: string;
  fullName: string;
  phone: string;
  countryCode?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

/**
 * Step 1 — create a Razorpay order and persist a Payment record with the
 * priced quote and address snapshot. Response returns everything the
 * frontend needs to open Razorpay Checkout.
 */
export async function createGatewayOrder(input: {
  userId: string;
  addressId: string;
}): Promise<{
  payment: {
    id: string;
    gatewayOrderId: string;
    amount: number;
    amountMinor: number;
    currency: 'INR' | 'USD';
    razorpayKeyId: string;
  };
  quote: Awaited<ReturnType<typeof buildCartSnapshot>>;
  user: { name: string; email: string; phone: string; countryCode: string };
}> {
  const user = await User.findById(input.userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (user.isBlocked) throw ApiError.forbidden('Account is blocked.');

  const addr = user.addresses.find((a) => String(a._id) === input.addressId);
  if (!addr) throw ApiError.badRequest('Selected address not found.');

  // Rebuild the cart snapshot — this recomputes prices from live products,
  // validates the coupon, and cleans up any stale items.
  const snap = await buildCartSnapshot(input.userId, { writeBack: true });
  if (snap.items.length === 0) throw ApiError.badRequest('Your cart is empty.');
  if (snap.grandTotal < MIN_ORDER_AMOUNT_INR) {
    throw ApiError.badRequest('Order total is too small.');
  }

  // Confirm all sizes still have enough stock right now.
  for (const line of snap.items) {
    if (line.quantity > line.availableStock) {
      throw ApiError.badRequest(
        `Only ${line.availableStock} of "${line.productName}" (${line.size}) left in stock.`,
      );
    }
  }

  // Snapshot the address exactly as it is now — the user cannot edit the
  // order-time address later, even if they edit the address book.
  const addressSnapshot: AddressSnapshot = {
    label: addr.label,
    fullName: addr.fullName,
    phone: addr.phone,
    countryCode: addr.countryCode,
    line1: addr.line1,
    line2: addr.line2 ?? '',
    landmark: addr.landmark ?? '',
    city: addr.city,
    state: addr.state,
    country: addr.country,
    zip: addr.zip,
  };

  const currency = snap.currency;
  const amountMinor = Math.round(snap.grandTotal * 100);

  const receipt = `TXL-${Date.now().toString(36).toUpperCase()}`;
  const rp = await razorpay.orders.create({
    amount: amountMinor,
    currency,
    receipt,
    notes: { userId: String(user._id), invoiceReceipt: receipt },
  });

  // If the coupon computed a discount, resolve its id for later usage recording.
  let couponId: string | null = null;
  if (snap.coupon.code) {
    try {
      const r = await validateAndComputeCoupon({
        code: snap.coupon.code,
        userId: input.userId,
        subtotal: snap.subtotal,
        lines: snap.items.map((l) => ({
          productId: l.productId,
          categoryId: l.categoryId,
          lineTotal: l.lineTotal,
        })),
      });
      couponId = r.couponId;
    } catch {
      // Coupon slipped between snapshot and now — proceed without it.
      couponId = null;
    }
  }

  const payment = await Payment.create({
    userId: user._id,
    gatewayOrderId: rp.id,
    amount: snap.grandTotal,
    amountMinor,
    currency,
    status: 'created',
    verified: false,
    quote: {
      items: snap.items.map((l) => ({
        productId: new Types.ObjectId(l.productId),
        sizeVariationId: new Types.ObjectId(l.sizeVariationId),
        productName: l.productName,
        productSlug: l.productSlug,
        categoryId: new Types.ObjectId(l.categoryId),
        primaryImage: l.primaryImage,
        size: l.size,
        unitPrice: l.unitPrice,
        discountPercent: l.discountPercent,
        netUnitPrice: l.netUnitPrice,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
      subtotal: snap.subtotal,
      shipping: snap.shipping,
      discount: snap.discount,
      tax: snap.tax,
      grandTotal: snap.grandTotal,
      coupon: {
        code: snap.coupon.code,
        type: snap.coupon.type,
        discountApplied: snap.coupon.discountApplied,
        freeShipping: snap.coupon.freeShipping,
        couponId: couponId ? new Types.ObjectId(couponId) : null,
      },
      addressSnapshot,
    },
  });

  return {
    payment: {
      id: String(payment._id),
      gatewayOrderId: rp.id,
      amount: snap.grandTotal,
      amountMinor,
      currency,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
    },
    quote: snap,
    user: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      countryCode: user.countryCode,
    },
  };
}

/**
 * Verify the HMAC signature returned by Razorpay Checkout.
 * Reference: https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/#12-verify-the-payment-signature
 */
export function verifyRazorpaySignature(params: {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${params.gatewayOrderId}|${params.gatewayPaymentId}`)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(params.signature, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Idempotent order fulfilment. Safe to call from BOTH the client verify
 * endpoint AND the webhook — if an Order already exists for the payment,
 * it is returned as-is with no side effects.
 */
async function fulfilOrder(payment: InstanceType<typeof Payment>): Promise<InstanceType<typeof Order>> {
  // Idempotency short-circuit
  if (payment.orderId) {
    const existing = await Order.findById(payment.orderId);
    if (existing) return existing;
  }
  const existingByPayment = await Order.findOne({ paymentId: payment._id });
  if (existingByPayment) {
    payment.orderId = existingByPayment._id as unknown as Types.ObjectId;
    await payment.save();
    return existingByPayment;
  }

  const q = payment.quote;
  if (!q || !q.items?.length) {
    throw ApiError.internal('Payment quote is missing — cannot fulfil order.');
  }

  // Reserve stock atomically per-line. `$inc` with a conditional filter
  // ensures we never go below zero even under concurrent orders.
  interface StockOp {
    productId: Types.ObjectId;
    sizeVariationId: Types.ObjectId;
    qty: number;
    applied: boolean;
  }
  const stockOps: StockOp[] = q.items.map((it) => ({
    productId: it.productId as Types.ObjectId,
    sizeVariationId: it.sizeVariationId as Types.ObjectId,
    qty: Number(it.quantity ?? 0),
    applied: false,
  }));

  for (const op of stockOps) {
    if (op.qty < 1) {
      await rollbackStock(stockOps.filter((s) => s.applied));
      throw ApiError.internal('Invalid line quantity in payment quote.');
    }
    const res = await Product.updateOne(
      {
        _id: op.productId,
        sizeVariations: {
          $elemMatch: { _id: op.sizeVariationId, stock: { $gte: op.qty } },
        },
      },
      { $inc: { 'sizeVariations.$.stock': -op.qty, totalStock: -op.qty } },
    );
    if (res.modifiedCount !== 1) {
      // rollback whatever we've decremented so far
      await rollbackStock(stockOps.filter((s) => s.applied));
      throw ApiError.conflict(
        'Insufficient stock at fulfilment time. Payment will be refunded.',
      );
    }
    op.applied = true;
  }

  // Refresh product statuses that may have hit 0 stock
  try {
    await Promise.all(
      stockOps.map(async (op) => {
        const p = await Product.findById(op.productId);
        if (p) await p.save(); // triggers pre('save') recompute
      }),
    );
  } catch (err) {
    logger.warn('Post-fulfil product recompute failed', err);
  }

  const orderNumber = newOrderNumber();
  const invoiceNumber = newInvoiceNumber();

  const user = await User.findById(payment.userId).lean();
  const userName = user?.name ?? '';
  const userEmail = user?.email ?? '';

  const order = await Order.create({
    orderNumber,
    invoiceNumber,
    userId: payment.userId,
    userEmail,
    userName,
    items: q.items.map((it) => ({
      productId: it.productId,
      sizeVariationId: it.sizeVariationId,
      productName: it.productName ?? '',
      productSlug: it.productSlug ?? '',
      categoryId: it.categoryId,
      primaryImage: it.primaryImage ?? '',
      size: it.size ?? '',
      unitPrice: it.unitPrice ?? 0,
      discountPercent: it.discountPercent ?? 0,
      netUnitPrice: it.netUnitPrice ?? 0,
      quantity: it.quantity ?? 1,
      lineTotal: it.lineTotal ?? 0,
    })),
    address: q.addressSnapshot,
    subtotal: q.subtotal,
    shipping: q.shipping,
    discount: q.discount,
    tax: q.tax,
    grandTotal: q.grandTotal,
    currency: payment.currency,
    coupon: q.coupon,
    paymentId: payment._id,
    gatewayPaymentId: payment.gatewayPaymentId ?? '',
    gatewayOrderId: payment.gatewayOrderId,
    paymentStatus: payment.status,
    orderStatus: 'confirmed',
    expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    timeline: [
      {
        at: new Date(),
        status: 'confirmed',
        note: 'Payment verified and order created.',
        actorType: 'system',
      },
    ],
  });

  payment.orderId = order._id as unknown as Types.ObjectId;
  await payment.save();

  // Best-effort side effects — none of these block success.
  const usage = payment.quote?.coupon;
  if (usage?.couponId) {
    try {
      await recordCouponUsage({
        couponId: String(usage.couponId),
        code: usage.code ?? '',
        userId: String(payment.userId),
        orderId: String(order._id),
        discountApplied: usage.discountApplied ?? 0,
      });
    } catch (err) {
      logger.warn('Coupon usage record failed', err);
    }
  }

  try {
    await Cart.updateOne(
      { userId: payment.userId },
      { $set: { items: [], couponCode: null } },
    );
  } catch (err) {
    logger.warn('Cart clear after order failed', err);
  }

  // Fire-and-forget emails with PDF invoice attached
  void (async () => {
    try {
      const pdf = await generateInvoicePdf(order);
      const orderEmailPayload = orderToEmailInput(order);
      await Promise.allSettled([
        sendOrderConfirmationEmail(userEmail, orderEmailPayload, {
          filename: `${order.invoiceNumber}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        }),
        sendAdminOrderNotification(orderEmailPayload),
      ]);
    } catch (err) {
      logger.error('Order emails/invoice failed', err);
    }
  })();

  return order;
}

async function rollbackStock(ops: Array<{ productId: Types.ObjectId; sizeVariationId: Types.ObjectId; qty: number }>): Promise<void> {
  await Promise.allSettled(
    ops.map((op) =>
      Product.updateOne(
        { _id: op.productId, 'sizeVariations._id': op.sizeVariationId },
        { $inc: { 'sizeVariations.$.stock': op.qty, totalStock: op.qty } },
      ),
    ),
  );
}

/**
 * Called from the /verify endpoint (client callback) after the user completes
 * checkout. If signature is invalid we mark the payment failed and throw.
 */
export async function verifyAndFulfil(input: {
  userId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}): Promise<{ orderNumber: string; orderId: string }> {
  const payment = await Payment.findOne({
    gatewayOrderId: input.gatewayOrderId,
    userId: input.userId,
  });
  if (!payment) throw ApiError.notFound('Payment record not found.');

  // If already fulfilled just return the order (webhook race).
  if (payment.orderId) {
    const existing = await Order.findById(payment.orderId).lean();
    if (existing) return { orderNumber: existing.orderNumber, orderId: String(existing._id) };
  }

  const valid = verifyRazorpaySignature({
    gatewayOrderId: input.gatewayOrderId,
    gatewayPaymentId: input.gatewayPaymentId,
    signature: input.signature,
  });
  if (!valid) {
    payment.status = 'failed';
    payment.failureReason = 'Invalid signature';
    payment.gatewayPaymentId = input.gatewayPaymentId;
    payment.gatewaySignature = input.signature;
    payment.failedAt = new Date();
    await payment.save();
    logger.warn(`Signature verification failed for gatewayOrderId=${input.gatewayOrderId}`);
    throw ApiError.badRequest('Payment signature verification failed. No order was created.');
  }

  payment.gatewayPaymentId = input.gatewayPaymentId;
  payment.gatewaySignature = input.signature;
  payment.status = 'verified';
  payment.verified = true;
  payment.verifiedAt = new Date();
  await payment.save();

  const order = await fulfilOrder(payment);
  return { orderNumber: order.orderNumber, orderId: String(order._id) };
}

/**
 * User-facing failure endpoint. Called when the Razorpay Checkout modal is
 * closed or errors out. Marks the payment failed so we don't leave orphan
 * "created" rows lying around.
 */
export async function markPaymentFailed(input: {
  userId: string;
  gatewayOrderId: string;
  reason?: string;
}): Promise<void> {
  const payment = await Payment.findOne({
    gatewayOrderId: input.gatewayOrderId,
    userId: input.userId,
  });
  if (!payment) return;
  if (payment.status === 'verified' || payment.status === 'captured') return;
  payment.status = 'failed';
  payment.failureReason = input.reason ?? 'Cancelled by user';
  payment.failedAt = new Date();
  await payment.save();
}

/**
 * Webhook handler. Razorpay signs the raw request body with the shared
 * secret. We verify that signature, then run the same idempotent fulfil.
 * Reference: https://razorpay.com/docs/webhooks/validate-test/
 */
export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw ApiError.unauthorized('Invalid webhook signature.');
  }

  const payload = JSON.parse(rawBody.toString('utf8')) as {
    event: string;
    payload: {
      payment?: { entity?: { id: string; order_id: string; status: string } };
      order?: { entity?: { id: string } };
    };
  };

  const paymentEntity = payload.payload?.payment?.entity;
  if (!paymentEntity) {
    logger.info(`Webhook received without payment entity: event=${payload.event}`);
    return;
  }

  const payment = await Payment.findOne({ gatewayOrderId: paymentEntity.order_id });
  if (!payment) {
    logger.warn(`Webhook for unknown gatewayOrderId=${paymentEntity.order_id}`);
    return;
  }

  if (payload.event === 'payment.captured' || payload.event === 'payment.authorized') {
    if (!payment.verified) {
      // We can't verify the HMAC here (that requires the callback signature),
      // but we CAN cross-check the amount against our quote. Amount mismatch
      // is a critical anomaly — refuse to fulfil.
      // Razorpay amount is in the smallest currency unit.
      const gatewayAmount = Number(
        (paymentEntity as unknown as { amount?: number }).amount ?? 0,
      );
      if (gatewayAmount && gatewayAmount !== payment.amountMinor) {
        payment.status = 'failed';
        payment.failureReason = `Amount mismatch: gateway=${gatewayAmount}, expected=${payment.amountMinor}`;
        payment.failedAt = new Date();
        await payment.save();
        logger.error(payment.failureReason);
        return;
      }
      payment.gatewayPaymentId = paymentEntity.id;
      payment.status = payload.event === 'payment.captured' ? 'captured' : 'verified';
      payment.verified = true;
      payment.verifiedAt = new Date();
      await payment.save();
    } else if (payload.event === 'payment.captured' && payment.status !== 'captured') {
      payment.status = 'captured';
      await payment.save();
    }
    try {
      await fulfilOrder(payment);
    } catch (err) {
      logger.error('Webhook fulfilOrder failed', err);
    }
  } else if (payload.event === 'payment.failed') {
    if (payment.status !== 'verified' && payment.status !== 'captured') {
      payment.status = 'failed';
      payment.gatewayPaymentId = paymentEntity.id;
      payment.failureReason =
        (paymentEntity as unknown as { error_description?: string }).error_description ??
        'Reported failed by gateway';
      payment.failedAt = new Date();
      await payment.save();
    }
  } else {
    logger.info(`Webhook event ignored: ${payload.event}`);
  }
}

function orderToEmailInput(order: InstanceType<typeof Order>): Parameters<typeof sendOrderConfirmationEmail>[1] {
  return {
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoiceNumber,
    userName: order.userName,
    items: order.items.map((it) => ({
      productName: it.productName,
      size: it.size,
      quantity: it.quantity,
      netUnitPrice: it.netUnitPrice,
      lineTotal: it.lineTotal,
      primaryImage: it.primaryImage,
    })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount,
    tax: order.tax,
    grandTotal: order.grandTotal,
    currency: order.currency,
    gatewayPaymentId: order.gatewayPaymentId,
    address: {
      fullName: order.address.fullName,
      phone: order.address.phone,
      countryCode: order.address.countryCode ?? undefined,
      line1: order.address.line1,
      line2: order.address.line2 ?? undefined,
      landmark: order.address.landmark ?? undefined,
      city: order.address.city,
      state: order.address.state,
      country: order.address.country,
      zip: order.address.zip,
    },
    expectedDelivery: order.expectedDelivery ?? null,
  };
}

// Keep mongoose lint quiet — the import is used indirectly via models
void mongoose;
