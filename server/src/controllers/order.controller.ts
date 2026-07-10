import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  listUserOrders,
  getUserOrderByNumber,
  cancelUserOrder,
  listOrdersAdmin,
  getOrderAdmin,
  updateOrderStatus,
} from '@/services/order.service';
import { Order } from '@/models/Order.model';
import { generateInvoicePdf } from '@/services/invoice.service';

function uid(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

// User
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await listUserOrders(
    uid(req),
    Number(req.query.page ?? 1),
    Number(req.query.limit ?? 10),
  );
  ok(res, data, 'OK');
});

export const getMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const o = await getUserOrderByNumber(uid(req), req.params.orderNumber);
  ok(res, { order: o }, 'OK');
});

export const postCancelMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const o = await cancelUserOrder(
    uid(req),
    req.params.orderNumber,
    String(req.body.reason ?? ''),
  );
  ok(res, { order: o }, 'Order cancelled.');
});

export const getMyInvoice = asyncHandler(async (req: Request, res: Response) => {
  const o = await Order.findOne({ userId: uid(req), orderNumber: req.params.orderNumber });
  if (!o) throw ApiError.notFound('Order not found.');
  const pdf = await generateInvoicePdf(o);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${o.invoiceNumber}.pdf"`,
  );
  res.send(pdf);
});

// Admin
export const adminListOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await listOrdersAdmin({
    q: req.query.q as string | undefined,
    status: req.query.status as never,
    userId: req.query.userId as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page as unknown as number,
    limit: req.query.limit as unknown as number,
  });
  ok(res, data, 'OK');
});

export const adminGetOrder = asyncHandler(async (req: Request, res: Response) => {
  const o = await getOrderAdmin(req.params.id);
  ok(res, { order: o }, 'OK');
});

export const adminUpdateOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) throw ApiError.unauthorized();
  const o = await updateOrderStatus({
    orderId: req.params.id,
    status: req.body.status,
    note: req.body.note,
    trackingNumber: req.body.trackingNumber,
    courier: req.body.courier,
    actorId: req.admin.id,
  });
  ok(res, { order: o }, 'Order updated.');
});

export const adminGetInvoice = asyncHandler(async (req: Request, res: Response) => {
  const idOrNumber = req.params.id;
  const q = /^[a-f\d]{24}$/i.test(idOrNumber)
    ? { _id: idOrNumber }
    : { orderNumber: idOrNumber };
  const o = await Order.findOne(q);
  if (!o) throw ApiError.notFound('Order not found.');
  const pdf = await generateInvoicePdf(o);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${o.invoiceNumber}.pdf"`);
  res.send(pdf);
});
