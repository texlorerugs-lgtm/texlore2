import { body } from 'express-validator';

export const createGatewayOrderValidators = [
  body('addressId').isMongoId(),
];

export const verifyPaymentValidators = [
  body('gatewayOrderId').isString().trim().notEmpty(),
  body('gatewayPaymentId').isString().trim().notEmpty(),
  body('signature').isString().trim().isLength({ min: 40, max: 200 }),
];

export const failPaymentValidators = [
  body('gatewayOrderId').isString().trim().notEmpty(),
  body('reason').optional().isString().isLength({ max: 500 }),
];
