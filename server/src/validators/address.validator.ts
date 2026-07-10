import { body, param } from 'express-validator';

export const addressCreateValidators = [
  body('label').optional().isString().isLength({ max: 40 }),
  body('fullName').isString().trim().notEmpty().isLength({ max: 120 }),
  body('phone').isString().matches(/^\d{6,15}$/),
  body('countryCode').optional().matches(/^\+\d{1,4}$/),
  body('line1').isString().trim().notEmpty().isLength({ max: 200 }),
  body('line2').optional().isString().isLength({ max: 200 }),
  body('landmark').optional().isString().isLength({ max: 120 }),
  body('city').isString().trim().notEmpty().isLength({ max: 80 }),
  body('state').isString().trim().notEmpty().isLength({ max: 80 }),
  body('country').optional().isString().isLength({ max: 80 }),
  body('zip').isString().matches(/^[A-Za-z0-9\s-]{3,12}$/),
  body('isDefault').optional().isBoolean().toBoolean(),
];

export const addressUpdateValidators = [
  param('id').isMongoId(),
  body('label').optional().isString().isLength({ max: 40 }),
  body('fullName').optional().isString().trim().isLength({ max: 120 }),
  body('phone').optional().matches(/^\d{6,15}$/),
  body('countryCode').optional().matches(/^\+\d{1,4}$/),
  body('line1').optional().isString().trim().isLength({ max: 200 }),
  body('line2').optional().isString().isLength({ max: 200 }),
  body('landmark').optional().isString().isLength({ max: 120 }),
  body('city').optional().isString().trim().isLength({ max: 80 }),
  body('state').optional().isString().trim().isLength({ max: 80 }),
  body('country').optional().isString().isLength({ max: 80 }),
  body('zip').optional().matches(/^[A-Za-z0-9\s-]{3,12}$/),
  body('isDefault').optional().isBoolean().toBoolean(),
];

export const idParam = [param('id').isMongoId()];
