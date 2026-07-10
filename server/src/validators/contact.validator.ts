import { body, param, query } from 'express-validator';

const STATUSES = ['new', 'read', 'replied', 'resolved', 'archived'] as const;

export const submitContactValidators = [
  body('name').isString().trim().notEmpty().isLength({ max: 120 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().matches(/^\d{6,15}$/),
  body('countryCode').optional().matches(/^\+\d{1,4}$/),
  body('message').isString().trim().isLength({ min: 8, max: 5000 }),
];

export const updateStatusValidators = [
  param('id').isMongoId(),
  body('status').isIn(STATUSES),
  body('adminNote').optional().isString().isLength({ max: 2000 }),
];

export const idParam = [param('id').isMongoId()];

export const listContactValidators = [
  query('q').optional().isString().isLength({ max: 120 }),
  query('status').optional().isIn([...STATUSES, 'all']),
  query('sort').optional().isString().isLength({ max: 100 }),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
];
