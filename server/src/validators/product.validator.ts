import { body, param, query } from 'express-validator';

const PRODUCT_STATUS = [
  'available',
  'out_of_stock',
  'hidden',
  'coming_soon',
  'discontinued',
] as const;

/**
 * Product create/update accept multipart with a JSON `payload` field that
 * carries the non-file fields. Images arrive as `images` file array; images
 * to remove arrive as JSON string array `removeImagePublicIds`; reordering
 * as `reorderPublicIds`.
 */
export const createProductValidators = [
  body('payload').exists().withMessage('payload JSON is required'),
];

export const updateProductValidators = [
  param('id').isMongoId(),
  body('payload').optional(),
];

export const idParam = [param('id').isMongoId()];
export const slugParam = [
  param('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/),
];

export const listProductsValidators = [
  query('q').optional({ checkFalsy: true }).isString().isLength({ max: 200 }),
  query('categoryId').optional({ checkFalsy: true }).isMongoId(),
  query('categorySlug').optional({ checkFalsy: true }).matches(/^[a-z0-9-]+$/),
  query('status').optional({ checkFalsy: true }).isIn([...PRODUCT_STATUS, 'all']),
  query('featured').optional({ checkFalsy: true }).isBoolean().toBoolean(),
  query('trending').optional({ checkFalsy: true }).isBoolean().toBoolean(),
  query('newArrival').optional({ checkFalsy: true }).isBoolean().toBoolean(),
  query('bestSeller').optional({ checkFalsy: true }).isBoolean().toBoolean(),
  query('minPrice').optional({ checkFalsy: true }).toFloat().isFloat({ min: 0 }),
  query('maxPrice').optional({ checkFalsy: true }).toFloat().isFloat({ min: 0 }),
  query('includeDeleted').optional({ checkFalsy: true }).isBoolean().toBoolean(),
  // Explicit allow-list: field[:asc|:desc][,field[:asc|:desc]]*
  // (letters, digits, dot for nested fields, colon+asc/desc, comma separator)
  query('sort')
    .optional({ checkFalsy: true })
    .matches(/^[A-Za-z0-9_.]+(:(asc|desc))?(,[A-Za-z0-9_.]+(:(asc|desc))?)*$/i)
    .withMessage('sort must be field[:asc|:desc][,field[:asc|:desc]]*')
    .isLength({ max: 200 }),
  query('page').optional({ checkFalsy: true }).toInt().isInt({ min: 1, max: 10000 }),
  query('limit').optional({ checkFalsy: true }).toInt().isInt({ min: 1, max: 60 }),
];
