/**
 * Category service. All admin write paths funnel through here so image
 * upload/delete stays consistent with the DB.
 *
 * Delete safeguards (Part 3): before removing a category we check for
 * products; caller decides what to do (move / cascade / cancel).
 */
import { Types } from 'mongoose';
import { Category, type CategoryStatus } from '@/models/Category.model';
import { Product } from '@/models/Product.model';
import { ApiError } from '@/utils/ApiError';
import {
  deleteCloudinaryImage,
  uploadBufferToCloudinary,
} from '@/config/cloudinary';
import { uniqueSlug } from '@/helpers/slug';

export interface CategoryImageInput {
  buffer: Buffer;
  mimetype: string;
}

export async function createCategory(input: {
  name: string;
  description?: string;
  status?: CategoryStatus;
  priority?: number;
  seoTitle?: string;
  seoDescription?: string;
  image: CategoryImageInput;
}): Promise<unknown> {
  const name = input.name.trim();
  if (!name) throw ApiError.badRequest('Category name is required.');

  // Duplicate-name check among live categories (case-insensitive)
  const nameClash = await Category.findOne({
    deletedAt: null,
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
  }).lean();
  if (nameClash) throw ApiError.conflict('A category with this name already exists.');

  const slug = await uniqueSlug(Category, name, { deletedAt: null });

  const uploaded = await uploadBufferToCloudinary(input.image.buffer, 'categories');

  const doc = await Category.create({
    name,
    slug,
    description: input.description ?? '',
    image: {
      url: uploaded.url,
      publicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
      format: uploaded.format,
    },
    status: input.status ?? 'active',
    priority: input.priority ?? 0,
    seoTitle: input.seoTitle ?? '',
    seoDescription: input.seoDescription ?? '',
  });
  return doc.toJSON();
}

export async function updateCategory(
  id: string,
  input: {
    name?: string;
    description?: string;
    status?: CategoryStatus;
    priority?: number;
    seoTitle?: string;
    seoDescription?: string;
    image?: CategoryImageInput;
  },
): Promise<unknown> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid category id.');
  const cat = await Category.findOne({ _id: id, deletedAt: null });
  if (!cat) throw ApiError.notFound('Category not found.');

  if (input.name && input.name.trim() !== cat.name) {
    const nextName = input.name.trim();
    const nameClash = await Category.findOne({
      _id: { $ne: cat._id },
      deletedAt: null,
      name: new RegExp(`^${escapeRegex(nextName)}$`, 'i'),
    }).lean();
    if (nameClash) throw ApiError.conflict('A category with this name already exists.');
    cat.name = nextName;
    cat.slug = await uniqueSlug(
      Category,
      nextName,
      { deletedAt: null },
      cat._id.toString(),
    );
  }
  if (input.description !== undefined) cat.description = input.description;
  if (input.status !== undefined) cat.status = input.status;
  if (input.priority !== undefined) cat.priority = input.priority;
  if (input.seoTitle !== undefined) cat.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined) cat.seoDescription = input.seoDescription;

  if (input.image) {
    const oldPublicId = cat.image?.publicId;
    const uploaded = await uploadBufferToCloudinary(input.image.buffer, 'categories');
    cat.image = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
      format: uploaded.format,
    };
    await cat.save();
    if (oldPublicId) await deleteCloudinaryImage(oldPublicId);
    return cat.toJSON();
  }

  await cat.save();
  return cat.toJSON();
}

/**
 * Pre-delete check — returns how many live products would be affected.
 * Frontend uses this to prompt: Move / Delete / Cancel.
 */
export async function getCategoryDeleteImpact(id: string): Promise<{
  productCount: number;
}> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid category id.');
  const productCount = await Product.countDocuments({ categoryId: id, deletedAt: null });
  return { productCount };
}

/**
 * Soft-delete a category. Three modes:
 *   - 'cancel'   → do nothing, throws with impact so caller can decide
 *   - 'move'     → require targetCategoryId, reassign products, then delete
 *   - 'cascade'  → soft-delete every product in the category, then delete
 *   - 'empty'    → only allowed when no live products exist (default fast path)
 */
export async function deleteCategory(
  id: string,
  mode: 'move' | 'cascade' | 'empty',
  targetCategoryId?: string,
): Promise<{ moved?: number; softDeleted?: number }> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid category id.');
  const cat = await Category.findOne({ _id: id, deletedAt: null });
  if (!cat) throw ApiError.notFound('Category not found.');

  const productCount = await Product.countDocuments({ categoryId: id, deletedAt: null });
  const now = new Date();
  let moved = 0;
  let softDeleted = 0;

  if (productCount > 0) {
    if (mode === 'empty') {
      throw ApiError.badRequest(
        `This category contains ${productCount} product(s). Choose move or cascade.`,
      );
    }
    if (mode === 'move') {
      if (!targetCategoryId || !Types.ObjectId.isValid(targetCategoryId)) {
        throw ApiError.badRequest('targetCategoryId is required for move.');
      }
      const target = await Category.findOne({ _id: targetCategoryId, deletedAt: null });
      if (!target) throw ApiError.badRequest('Target category not found.');
      if (String(target._id) === String(cat._id)) {
        throw ApiError.badRequest('Target category must differ from the one being deleted.');
      }
      const r = await Product.updateMany(
        { categoryId: id, deletedAt: null },
        { $set: { categoryId: target._id } },
      );
      moved = r.modifiedCount ?? 0;
      // refresh denormalized counts
      target.productCount = await Product.countDocuments({
        categoryId: target._id,
        deletedAt: null,
      });
      await target.save();
    } else if (mode === 'cascade') {
      const r = await Product.updateMany(
        { categoryId: id, deletedAt: null },
        { $set: { deletedAt: now } },
      );
      softDeleted = r.modifiedCount ?? 0;
    }
  }

  cat.deletedAt = now;
  cat.status = 'archived';
  cat.productCount = 0;
  await cat.save();

  return { moved, softDeleted };
}

export async function restoreCategory(id: string): Promise<unknown> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid category id.');
  const cat = await Category.findById(id);
  if (!cat) throw ApiError.notFound('Category not found.');
  if (!cat.deletedAt) throw ApiError.badRequest('Category is not deleted.');

  // Ensure name/slug still don't clash with a live category
  const nameClash = await Category.findOne({
    _id: { $ne: cat._id },
    deletedAt: null,
    name: new RegExp(`^${escapeRegex(cat.name)}$`, 'i'),
  }).lean();
  if (nameClash) {
    throw ApiError.conflict(
      'A live category with the same name exists. Rename before restoring.',
    );
  }
  cat.slug = await uniqueSlug(Category, cat.name, { deletedAt: null }, cat._id.toString());
  cat.deletedAt = null;
  cat.status = 'active';
  cat.productCount = await Product.countDocuments({
    categoryId: cat._id,
    deletedAt: null,
  });
  await cat.save();
  return cat.toJSON();
}

/**
 * Admin listing with search, sort, pagination.
 */
export async function listCategoriesAdmin(params: {
  q?: string;
  status?: CategoryStatus | 'all';
  includeDeleted?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20)));
  const filter: Record<string, unknown> = {};
  if (!params.includeDeleted) filter.deletedAt = null;
  if (params.status && params.status !== 'all') filter.status = params.status;
  if (params.q && params.q.trim()) {
    filter.name = new RegExp(escapeRegex(params.q.trim()), 'i');
  }

  const sort = parseSort(params.sort) ?? { priority: -1, createdAt: -1 };
  const [items, total] = await Promise.all([
    Category.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);
  return {
    items: items.map(normalize),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Public listing — active + non-deleted, no admin fields, sorted by priority.
 */
export async function listCategoriesPublic(): Promise<unknown[]> {
  const items = await Category.find({ deletedAt: null, status: 'active' })
    .sort({ priority: -1, createdAt: -1 })
    .lean();
  return items.map(normalize).map(publicShape);
}

export async function getCategoryBySlug(slug: string): Promise<unknown> {
  const c = await Category.findOne({ slug: slug.toLowerCase(), deletedAt: null }).lean();
  if (!c) throw ApiError.notFound('Category not found.');
  return publicShape(normalize(c));
}

export async function refreshCategoryProductCount(categoryId: string): Promise<void> {
  if (!Types.ObjectId.isValid(categoryId)) return;
  const count = await Product.countDocuments({ categoryId, deletedAt: null });
  await Category.updateOne({ _id: categoryId }, { $set: { productCount: count } });
}

// --- utils ---

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSort(sort?: string): Record<string, 1 | -1> | null {
  if (!sort) return null;
  // format: "field:asc,field2:desc"
  const out: Record<string, 1 | -1> = {};
  for (const token of sort.split(',')) {
    const [field, dir] = token.split(':');
    if (!field) continue;
    out[field.trim()] = dir?.trim().toLowerCase() === 'asc' ? 1 : -1;
  }
  return Object.keys(out).length ? out : null;
}

function normalize(doc: Record<string, unknown> & { _id?: unknown }): Record<string, unknown> {
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
}

function publicShape(doc: Record<string, unknown>): Record<string, unknown> {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    image: doc.image,
    priority: doc.priority,
    productCount: doc.productCount,
    seoTitle: doc.seoTitle,
    seoDescription: doc.seoDescription,
  };
}
