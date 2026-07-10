import { body, param, query } from 'express-validator';

const STATUSES = ['active', 'hidden', 'archived'] as const;

export const createCategoryValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('status').optional().isIn(STATUSES),
  body('priority').optional().toInt().isInt({ min: 0, max: 999 }),
  body('seoTitle').optional().isString().isLength({ max: 160 }),
  body('seoDescription').optional().isString().isLength({ max: 500 }),
];

export const updateCategoryValidators = [
  param('id').isMongoId().withMessage('Invalid id'),
  body('name').optional().trim().isLength({ min: 1, max: 80 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('status').optional().isIn(STATUSES),
  body('priority').optional().toInt().isInt({ min: 0, max: 999 }),
  body('seoTitle').optional().isString().isLength({ max: 160 }),
  body('seoDescription').optional().isString().isLength({ max: 500 }),
];

export const idParamValidator = [param('id').isMongoId().withMessage('Invalid id')];

export const slugParamValidator = [
  param('slug').trim().notEmpty().isLength({ max: 120 }).matches(/^[a-z0-9-]+$/),
];

export const deleteCategoryValidators = [
  param('id').isMongoId(),
  body('mode').isIn(['empty', 'move', 'cascade']),
  body('targetCategoryId').optional().isMongoId(),
];

export const listCategoriesValidators = [
  query('q').optional().isString().isLength({ max: 120 }),
  query('status').optional().isIn([...STATUSES, 'all']),
  query('includeDeleted').optional().isBoolean().toBoolean(),
  query('sort').optional().isString().isLength({ max: 100 }),
  query('page').optional().toInt().isInt({ min: 1, max: 10000 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
];
