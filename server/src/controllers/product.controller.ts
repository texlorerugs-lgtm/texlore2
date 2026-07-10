/**
 * Product controllers. Admin write endpoints accept multipart/form-data:
 *   - files:  `images` (0..7 for update, 1..7 for create)
 *   - body:   `payload` — JSON string containing all non-file fields
 *
 * Sending fields as JSON in a single string avoids the string-only body issue
 * with multipart forms and gives us type-safe parsing on the server.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok, created } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  createProduct,
  updateProduct,
  softDeleteProduct,
  restoreProduct,
  listProductsAdmin,
  listProductsPublic,
  getProductBySlug,
  getRelatedProducts,
  getAdminProduct,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/services/product.service';

function parsePayload<T>(req: Request): T {
  const raw = req.body?.payload;
  if (raw == null) throw ApiError.badRequest('Missing payload.');
  if (typeof raw === 'object') return raw as T;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    throw ApiError.badRequest('payload must be valid JSON.');
  }
}

function filesFromReq(req: Request): Express.Multer.File[] {
  const files = (req.files ?? []) as Express.Multer.File[];
  return Array.isArray(files) ? files : [];
}

// -------- Admin --------

export const adminCreateProduct = asyncHandler(async (req: Request, res: Response) => {
  const payload = parsePayload<Omit<CreateProductInput, 'images'>>(req);
  const files = filesFromReq(req);
  if (files.length < 1) throw ApiError.badRequest('Upload at least one image.');
  if (files.length > 7) throw ApiError.badRequest('Maximum of 7 images allowed.');

  const doc = await createProduct({
    ...payload,
    images: files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype })),
  });
  created(res, { product: doc }, 'Product created.');
});

export const adminUpdateProduct = asyncHandler(async (req: Request, res: Response) => {
  const payload = parsePayload<UpdateProductInput>(req);
  const files = filesFromReq(req);
  const newImages = files.length
    ? files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }))
    : undefined;
  const doc = await updateProduct(req.params.id, { ...payload, newImages });
  ok(res, { product: doc }, 'Product updated.');
});

export const adminDeleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await softDeleteProduct(req.params.id);
  ok(res, null, 'Product moved to trash.');
});

export const adminRestoreProduct = asyncHandler(async (req: Request, res: Response) => {
  const p = await restoreProduct(req.params.id);
  ok(res, { product: p }, 'Product restored.');
});

export const adminListProducts = asyncHandler(async (req: Request, res: Response) => {
  const data = await listProductsAdmin({
    q: req.query.q as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
    categorySlug: req.query.categorySlug as string | undefined,
    status: req.query.status as never,
    featured: req.query.featured as unknown as boolean,
    trending: req.query.trending as unknown as boolean,
    newArrival: req.query.newArrival as unknown as boolean,
    bestSeller: req.query.bestSeller as unknown as boolean,
    minPrice: req.query.minPrice as unknown as number,
    maxPrice: req.query.maxPrice as unknown as number,
    includeDeleted: req.query.includeDeleted as unknown as boolean,
    sort: req.query.sort as string | undefined,
    page: req.query.page as unknown as number,
    limit: req.query.limit as unknown as number,
  });
  ok(res, data, 'OK');
});

export const adminGetProduct = asyncHandler(async (req: Request, res: Response) => {
  const p = await getAdminProduct(req.params.id);
  ok(res, { product: p }, 'OK');
});

// -------- Public --------

export const publicListProducts = asyncHandler(async (req: Request, res: Response) => {
  const data = await listProductsPublic({
    q: req.query.q as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
    categorySlug: req.query.categorySlug as string | undefined,
    featured: req.query.featured as unknown as boolean,
    trending: req.query.trending as unknown as boolean,
    newArrival: req.query.newArrival as unknown as boolean,
    bestSeller: req.query.bestSeller as unknown as boolean,
    minPrice: req.query.minPrice as unknown as number,
    maxPrice: req.query.maxPrice as unknown as number,
    sort: req.query.sort as string | undefined,
    page: req.query.page as unknown as number,
    limit: req.query.limit as unknown as number,
  });
  ok(res, data, 'OK');
});

export const publicGetProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const p = await getProductBySlug(req.params.slug);
  ok(res, { product: p }, 'OK');
});

export const publicGetRelated = asyncHandler(async (req: Request, res: Response) => {
  const items = await getRelatedProducts(
    req.params.slug,
    Math.min(24, Math.max(1, Number(req.query.limit ?? 8))),
  );
  ok(res, { products: items }, 'OK');
});
