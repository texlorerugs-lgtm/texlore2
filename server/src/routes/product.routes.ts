import { Router } from 'express';
import { requireAdmin, requirePermission } from '@/middlewares/admin';
import { validate } from '@/middlewares/validate';
import { uploadImages } from '@/middlewares/upload';
import {
  createProductValidators,
  updateProductValidators,
  idParam,
  slugParam,
  listProductsValidators,
} from '@/validators/product.validator';
import {
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminRestoreProduct,
  adminListProducts,
  adminGetProduct,
  publicListProducts,
  publicGetProductBySlug,
  publicGetRelated,
} from '@/controllers/product.controller';

// Public
export const productPublicRouter = Router();
productPublicRouter.get('/', listProductsValidators, validate, publicListProducts);
productPublicRouter.get('/:slug', slugParam, validate, publicGetProductBySlug);
productPublicRouter.get('/:slug/related', slugParam, validate, publicGetRelated);

// Admin
export const productAdminRouter = Router();
productAdminRouter.use(requireAdmin, requirePermission('product:manage'));

productAdminRouter.get('/', listProductsValidators, validate, adminListProducts);
productAdminRouter.get('/:id', idParam, validate, adminGetProduct);
productAdminRouter.post(
  '/',
  uploadImages.array('images', 7),
  createProductValidators,
  validate,
  adminCreateProduct,
);
productAdminRouter.patch(
  '/:id',
  uploadImages.array('images', 7),
  updateProductValidators,
  validate,
  adminUpdateProduct,
);
productAdminRouter.post('/:id/delete', idParam, validate, adminDeleteProduct);
productAdminRouter.post('/:id/restore', idParam, validate, adminRestoreProduct);
