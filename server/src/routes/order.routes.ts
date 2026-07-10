import { Router } from 'express';
import { requireUser } from '@/middlewares/auth';
import { requireAdmin, requirePermission } from '@/middlewares/admin';
import { validate } from '@/middlewares/validate';
import {
  orderNumberParam,
  cancelOrderValidators,
  listOrdersValidators,
  updateOrderStatusValidators,
  idParam,
} from '@/validators/order.validator';
import {
  getMyOrders,
  getMyOrder,
  postCancelMyOrder,
  getMyInvoice,
  adminListOrders,
  adminGetOrder,
  adminUpdateOrder,
  adminGetInvoice,
} from '@/controllers/order.controller';

// User
export const orderUserRouter = Router();
orderUserRouter.use(requireUser);
orderUserRouter.get('/', getMyOrders);
orderUserRouter.get('/:orderNumber', orderNumberParam, validate, getMyOrder);
orderUserRouter.post('/:orderNumber/cancel', cancelOrderValidators, validate, postCancelMyOrder);
orderUserRouter.get('/:orderNumber/invoice', orderNumberParam, validate, getMyInvoice);

// Admin
export const orderAdminRouter = Router();
orderAdminRouter.use(requireAdmin, requirePermission('order:manage'));
orderAdminRouter.get('/', listOrdersValidators, validate, adminListOrders);
orderAdminRouter.get('/:id', idParam, validate, adminGetOrder);
orderAdminRouter.get('/:id/invoice', idParam, validate, adminGetInvoice);
orderAdminRouter.patch('/:id/status', updateOrderStatusValidators, validate, adminUpdateOrder);
