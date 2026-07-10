/**
 * Category controllers. Admin routes require multipart/form-data for image
 * uploads; the uploaded file lands on req.file thanks to multer memoryStorage.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok, created } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  listCategoriesAdmin,
  listCategoriesPublic,
  getCategoryBySlug,
  getCategoryDeleteImpact,
} from '@/services/category.service';
import { Category } from '@/models/Category.model';

function requireFile(req: Request): Express.Multer.File {
  const f = req.file;
  if (!f) throw ApiError.badRequest('Category image is required.');
  return f;
}

// -------- Admin --------

export const adminCreateCategory = asyncHandler(async (req: Request, res: Response) => {
  const file = requireFile(req);
  const doc = await createCategory({
    name: String(req.body.name ?? ''),
    description: req.body.description ? String(req.body.description) : undefined,
    status: req.body.status,
    priority: req.body.priority ? Number(req.body.priority) : undefined,
    seoTitle: req.body.seoTitle,
    seoDescription: req.body.seoDescription,
    image: { buffer: file.buffer, mimetype: file.mimetype },
  });
  created(res, { category: doc }, 'Category created.');
});

export const adminUpdateCategory = asyncHandler(async (req: Request, res: Response) => {
  const image = req.file
    ? { buffer: req.file.buffer, mimetype: req.file.mimetype }
    : undefined;
  const doc = await updateCategory(req.params.id, {
    name: req.body.name,
    description: req.body.description,
    status: req.body.status,
    priority: req.body.priority !== undefined ? Number(req.body.priority) : undefined,
    seoTitle: req.body.seoTitle,
    seoDescription: req.body.seoDescription,
    image,
  });
  ok(res, { category: doc }, 'Category updated.');
});

export const adminListCategories = asyncHandler(async (req: Request, res: Response) => {
  const data = await listCategoriesAdmin({
    q: req.query.q as string | undefined,
    status: req.query.status as never,
    includeDeleted: req.query.includeDeleted as unknown as boolean,
    sort: req.query.sort as string | undefined,
    page: req.query.page as unknown as number,
    limit: req.query.limit as unknown as number,
  });
  ok(res, data, 'OK');
});

export const adminGetCategory = asyncHandler(async (req: Request, res: Response) => {
  const c = await Category.findById(req.params.id).lean();
  if (!c) throw ApiError.notFound('Category not found.');
  const { _id, ...rest } = c;
  ok(res, { category: { id: String(_id), ...rest } }, 'OK');
});

export const adminGetCategoryDeleteImpact = asyncHandler(
  async (req: Request, res: Response) => {
    const impact = await getCategoryDeleteImpact(req.params.id);
    ok(res, impact, 'OK');
  },
);

export const adminDeleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteCategory(
    req.params.id,
    req.body.mode as 'empty' | 'move' | 'cascade',
    req.body.targetCategoryId as string | undefined,
  );
  ok(res, result, 'Category deleted.');
});

export const adminRestoreCategory = asyncHandler(async (req: Request, res: Response) => {
  const c = await restoreCategory(req.params.id);
  ok(res, { category: c }, 'Category restored.');
});

// -------- Public --------

export const publicListCategories = asyncHandler(async (_req: Request, res: Response) => {
  const items = await listCategoriesPublic();
  ok(res, { categories: items }, 'OK');
});

export const publicGetCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const c = await getCategoryBySlug(req.params.slug);
  ok(res, { category: c }, 'OK');
});
