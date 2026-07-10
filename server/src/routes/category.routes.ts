/**
 * Public: /api/v1/categories
 * Admin:  /api/v1/admin/categories
 *
 * Admin write endpoints accept multipart/form-data with a single `image` field.
 */
import { Router } from 'express';
import { requireAdmin, requirePermission } from '@/middlewares/admin';
import { validate } from '@/middlewares/validate';
import { uploadImages } from '@/middlewares/upload';
import {
  createCategoryValidators,
  updateCategoryValidators,
  listCategoriesValidators,
  idParamValidator,
  slugParamValidator,
  deleteCategoryValidators,
} from '@/validators/category.validator';
import {
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminRestoreCategory,
  adminListCategories,
  adminGetCategory,
  adminGetCategoryDeleteImpact,
  publicListCategories,
  publicGetCategoryBySlug,
} from '@/controllers/category.controller';

// Public
export const categoryPublicRouter = Router();
categoryPublicRouter.get('/', publicListCategories);
categoryPublicRouter.get('/:slug', slugParamValidator, validate, publicGetCategoryBySlug);

// Admin
export const categoryAdminRouter = Router();
categoryAdminRouter.use(requireAdmin, requirePermission('category:manage'));

categoryAdminRouter.get('/', listCategoriesValidators, validate, adminListCategories);
categoryAdminRouter.get('/:id', idParamValidator, validate, adminGetCategory);
categoryAdminRouter.get(
  '/:id/delete-impact',
  idParamValidator,
  validate,
  adminGetCategoryDeleteImpact,
);
categoryAdminRouter.post(
  '/',
  uploadImages.single('image'),
  createCategoryValidators,
  validate,
  adminCreateCategory,
);
categoryAdminRouter.patch(
  '/:id',
  uploadImages.single('image'),
  updateCategoryValidators,
  validate,
  adminUpdateCategory,
);
categoryAdminRouter.post(
  '/:id/delete',
  deleteCategoryValidators,
  validate,
  adminDeleteCategory,
);
categoryAdminRouter.post(
  '/:id/restore',
  idParamValidator,
  validate,
  adminRestoreCategory,
);
