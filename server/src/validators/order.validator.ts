import { body, param, query } from 'express-validator';
import { ORDER_STATUSES } from '@/models/Order.model';

export const orderNumberParam = [
  param('orderNumber')
    .isString()
    .trim()
    .matches(/^TXL-\d{8}-[A-F0-9]+$/i)
    .withMessage('Invalid order number'),
];

export const cancelOrderValidators = [
  ...orderNumberParam,
  body('reason').optional().isString().isLength({ max: 500 }),
];

export const listOrdersValidators = [
  query('q').optional().isString().isLength({ max: 120 }),
  query('status').optional().isIn([...ORDER_STATUSES, 'all']),
  query('userId').optional().isMongoId(),
  query('sort').optional().isString().isLength({ max: 100 }),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
];

export const updateOrderStatusValidators = [
  param('id').isString().trim().notEmpty(),
  body('status').isIn(ORDER_STATUSES),
  body('note').optional().isString().isLength({ max: 1000 }),
  body('trackingNumber').optional().isString().isLength({ max: 120 }),
  body('courier').optional().isString().isLength({ max: 80 }),
];

export const idParam = [param('id').isString().trim().notEmpty()];
