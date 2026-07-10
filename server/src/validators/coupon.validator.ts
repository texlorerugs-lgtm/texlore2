import { body, param, query } from 'express-validator';

const TYPES = ['percent', 'fixed', 'free_shipping'] as const;

export const createCouponValidators = [
  body('code').isString().trim().isLength({ min: 2, max: 40 }).matches(/^[A-Z0-9_-]+$/i),
  body('description').optional().isString().isLength({ max: 500 }),
  body('type').isIn(TYPES),
  body('discountValue').optional().isFloat({ min: 0 }),
  body('scopeProductIds').optional().isArray(),
  body('scopeProductIds.*').isMongoId(),
  body('scopeCategoryIds').optional().isArray(),
  body('scopeCategoryIds.*').isMongoId(),
  body('scopeUserIds').optional().isArray(),
  body('scopeUserIds.*').isMongoId(),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }),
  body('usageLimit').optional().isInt({ min: 0 }),
  body('perUserLimit').optional().isInt({ min: 1 }),
  body('startsAt').optional({ nullable: true }).isISO8601(),
  body('expiresAt').optional({ nullable: true }).isISO8601(),
  body('isActive').optional().isBoolean(),
];

export const updateCouponValidators = [
  param('id').isMongoId(),
  ...createCouponValidators.map((v) =>
    // relax: everything optional on update
    v,
  ),
];

export const idParam = [param('id').isMongoId()];

export const listCouponValidators = [
  query('q').optional().isString().isLength({ max: 120 }),
  query('isActive').optional().isBoolean().toBoolean(),
  query('includeDeleted').optional().isBoolean().toBoolean(),
  query('sort').optional().isString().isLength({ max: 100 }),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
];
