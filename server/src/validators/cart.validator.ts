import { body, param } from 'express-validator';

export const addToCartValidators = [
  body('productId').isMongoId(),
  body('sizeVariationId').isMongoId(),
  body('quantity').toInt().isInt({ min: 1, max: 20 }),
];

export const updateCartValidators = [
  param('itemId').isMongoId(),
  body('quantity').toInt().isInt({ min: 1, max: 20 }),
];

export const itemIdParam = [param('itemId').isMongoId()];

export const couponValidators = [
  body('code').isString().isLength({ min: 2, max: 40 }),
];
