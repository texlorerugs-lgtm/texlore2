/**
 * Product service — CRUD, image management (Cloudinary-synced), soft delete,
 * search + pagination for both admin and public listings.
 */
import { Types } from 'mongoose';
import { Product, type ProductStatus } from '@/models/Product.model';
import { Category } from '@/models/Category.model';
import { ApiError } from '@/utils/ApiError';
import {
  deleteCloudinaryImage,
  uploadBufferToCloudinary,
} from '@/config/cloudinary';
import { uniqueSlug } from '@/helpers/slug';
import { refreshCategoryProductCount } from '@/services/category.service';

export interface ProductImageInput {
  buffer: Buffer;
  mimetype: string;
}

export interface SizeVariationInput {
  size: string;
  sku?: string;
  price: number;
  discountPercent?: number;
  stock: number;
  weightKg?: number;
  isPrimary?: boolean;
}

export interface CreateProductInput {
  categoryId: string;
  name: string;
  description?: string;
  productType?: string;
  material?: string;
  origin?: string;
  shape?: string;
  color?: string;
  weightKg?: number;
  pileHeightMm?: number;
  knotDensity?: string;
  construction?: string;
  careInstructions?: string;
  shippingInfo?: string;
  warranty?: string;
  sizeVariations: SizeVariationInput[];
  status?: ProductStatus;
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  images: ProductImageInput[]; // 1..7
}

function validateSizeVariations(vs: SizeVariationInput[]): void {
  if (!Array.isArray(vs) || vs.length === 0) {
    throw ApiError.badRequest('At least one size variation is required.');
  }
  const seen = new Set<string>();
  let primaries = 0;
  for (const v of vs) {
    if (!v.size?.trim()) throw ApiError.badRequest('Size is required for every variation.');
    const key = v.size.trim().toLowerCase();
    if (seen.has(key)) throw ApiError.badRequest(`Duplicate size variation: ${v.size}`);
    seen.add(key);
    if (!(v.price >= 0)) throw ApiError.badRequest('Price must be a non-negative number.');
    if (!(v.stock >= 0)) throw ApiError.badRequest('Stock must be a non-negative integer.');
    if (v.discountPercent != null && (v.discountPercent < 0 || v.discountPercent > 90)) {
      throw ApiError.badRequest('Discount must be between 0 and 90 percent.');
    }
    if (v.isPrimary) primaries += 1;
  }
  if (primaries > 1) throw ApiError.badRequest('Only one size variation can be primary.');
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  if (!Types.ObjectId.isValid(categoryId)) throw ApiError.badRequest('Invalid category id.');
  const cat = await Category.findOne({ _id: categoryId, deletedAt: null }).lean();
  if (!cat) throw ApiError.badRequest('Category does not exist.');
}

// ---------- CREATE ----------

export async function createProduct(input: CreateProductInput): Promise<unknown> {
  if (!input.name?.trim()) throw ApiError.badRequest('Product name is required.');
  if (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > 7) {
    throw ApiError.badRequest('Between 1 and 7 images are required.');
  }
  validateSizeVariations(input.sizeVariations);
  await assertCategoryExists(input.categoryId);

  const slug = await uniqueSlug(Product, input.name, { deletedAt: null });

  // Upload every image in parallel; if any fails we roll back Cloudinary uploads.
  const uploaded: Array<{ publicId: string; asset: Awaited<ReturnType<typeof uploadBufferToCloudinary>> }> = [];
  try {
    const results = await Promise.all(
      input.images.map((img) => uploadBufferToCloudinary(img.buffer, 'products')),
    );
    for (const r of results) uploaded.push({ publicId: r.publicId, asset: r });

    // Ensure exactly one primary variation on save.
    const vs = input.sizeVariations.map((v, i) => ({
      size: v.size.trim(),
      sku: v.sku ?? '',
      price: v.price,
      discountPercent: v.discountPercent ?? 0,
      stock: v.stock,
      weightKg: v.weightKg ?? 0,
      isPrimary: v.isPrimary ?? (i === 0 ? true : false),
    }));
    if (!vs.some((v) => v.isPrimary)) vs[0].isPrimary = true;

    const images = uploaded.map((u, i) => ({
      url: u.asset.url,
      publicId: u.asset.publicId,
      width: u.asset.width,
      height: u.asset.height,
      bytes: u.asset.bytes,
      format: u.asset.format,
      order: i,
    }));

    const doc = await Product.create({
      categoryId: input.categoryId,
      name: input.name.trim(),
      slug,
      description: input.description ?? '',
      productType: input.productType ?? 'rug',
      material: input.material ?? '',
      origin: input.origin ?? '',
      shape: input.shape ?? 'Rectangular',
      color: input.color ?? '',
      weightKg: input.weightKg ?? 0,
      pileHeightMm: input.pileHeightMm ?? 0,
      knotDensity: input.knotDensity ?? '',
      construction: input.construction ?? '',
      careInstructions: input.careInstructions ?? '',
      shippingInfo: input.shippingInfo ?? '',
      warranty: input.warranty ?? '',
      sizeVariations: vs,
      status: input.status ?? 'available',
      featured: !!input.featured,
      trending: !!input.trending,
      newArrival: !!input.newArrival,
      bestSeller: !!input.bestSeller,
      seoTitle: input.seoTitle ?? '',
      seoDescription: input.seoDescription ?? '',
      tags: input.tags ?? [],
      images,
    });

    await refreshCategoryProductCount(input.categoryId);
    return doc.toJSON();
  } catch (err) {
    // Rollback uploaded images so we don't leak Cloudinary assets on failure.
    await Promise.allSettled(uploaded.map((u) => deleteCloudinaryImage(u.publicId)));
    throw err;
  }
}

// ---------- UPDATE ----------

export interface UpdateProductInput extends Partial<Omit<CreateProductInput, 'images'>> {
  /** IDs (Cloudinary publicIds) of images to remove. */
  removeImagePublicIds?: string[];
  /** New images to append (subject to 1..7 total). */
  newImages?: ProductImageInput[];
  /** Reorder existing images: array of publicIds in desired display order. */
  reorderPublicIds?: string[];
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<unknown> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid product id.');
  const doc = await Product.findOne({ _id: id, deletedAt: null });
  if (!doc) throw ApiError.notFound('Product not found.');

  const oldCategoryId = doc.categoryId.toString();

  if (input.categoryId && input.categoryId !== oldCategoryId) {
    await assertCategoryExists(input.categoryId);
    doc.categoryId = new Types.ObjectId(input.categoryId);
  }
  if (input.name && input.name.trim() !== doc.name) {
    doc.name = input.name.trim();
    doc.slug = await uniqueSlug(Product, doc.name, { deletedAt: null }, doc._id.toString());
  }
  if (input.description !== undefined) doc.description = input.description;
  if (input.productType !== undefined) doc.productType = input.productType;
  if (input.material !== undefined) doc.material = input.material;
  if (input.origin !== undefined) doc.origin = input.origin;
  if (input.shape !== undefined) doc.shape = input.shape;
  if (input.color !== undefined) doc.color = input.color;
  if (input.weightKg !== undefined) doc.weightKg = input.weightKg;
  if (input.pileHeightMm !== undefined) doc.pileHeightMm = input.pileHeightMm;
  if (input.knotDensity !== undefined) doc.knotDensity = input.knotDensity;
  if (input.construction !== undefined) doc.construction = input.construction;
  if (input.careInstructions !== undefined) doc.careInstructions = input.careInstructions;
  if (input.shippingInfo !== undefined) doc.shippingInfo = input.shippingInfo;
  if (input.warranty !== undefined) doc.warranty = input.warranty;
  if (input.status !== undefined) doc.status = input.status;
  if (input.featured !== undefined) doc.featured = !!input.featured;
  if (input.trending !== undefined) doc.trending = !!input.trending;
  if (input.newArrival !== undefined) doc.newArrival = !!input.newArrival;
  if (input.bestSeller !== undefined) doc.bestSeller = !!input.bestSeller;
  if (input.seoTitle !== undefined) doc.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined) doc.seoDescription = input.seoDescription;
  if (input.tags !== undefined) doc.tags = input.tags;

  if (input.sizeVariations) {
    validateSizeVariations(input.sizeVariations);
    doc.sizeVariations.splice(
      0,
      doc.sizeVariations.length,
      ...input.sizeVariations.map((v, i) => ({
        size: v.size.trim(),
        sku: v.sku ?? '',
        price: v.price,
        discountPercent: v.discountPercent ?? 0,
        stock: v.stock,
        weightKg: v.weightKg ?? 0,
        isPrimary: v.isPrimary ?? (i === 0),
      })),
    );
  }

  // --- Image management ---
  const removeSet = new Set(input.removeImagePublicIds ?? []);
  const toDelete: string[] = [];
  if (removeSet.size > 0) {
    const kept = doc.images.filter((img) => {
      if (removeSet.has(img.publicId)) {
        toDelete.push(img.publicId);
        return false;
      }
      return true;
    });
    doc.images.splice(0, doc.images.length, ...kept);
  }

  const uploaded: string[] = [];
  if (input.newImages && input.newImages.length > 0) {
    try {
      const results = await Promise.all(
        input.newImages.map((img) => uploadBufferToCloudinary(img.buffer, 'products')),
      );
      for (const r of results) {
        uploaded.push(r.publicId);
        doc.images.push({
          url: r.url,
          publicId: r.publicId,
          width: r.width,
          height: r.height,
          bytes: r.bytes,
          format: r.format,
          order: doc.images.length,
        });
      }
    } catch (err) {
      await Promise.allSettled(uploaded.map((p) => deleteCloudinaryImage(p)));
      throw err;
    }
  }

  if (input.reorderPublicIds && input.reorderPublicIds.length > 0) {
    const order = new Map(input.reorderPublicIds.map((pid, idx) => [pid, idx]));
    doc.images.sort((a, b) => (order.get(a.publicId) ?? 999) - (order.get(b.publicId) ?? 999));
    doc.images.forEach((img, i) => {
      img.order = i;
    });
  }

  if (doc.images.length < 1 || doc.images.length > 7) {
    // Undo the delete plan and any uploads on this pass to keep image count valid.
    await Promise.allSettled(uploaded.map((p) => deleteCloudinaryImage(p)));
    throw ApiError.badRequest('Product must have between 1 and 7 images.');
  }

  await doc.save();

  // Only physically delete from Cloudinary after DB save succeeds.
  await Promise.allSettled(toDelete.map((p) => deleteCloudinaryImage(p)));

  if (input.categoryId && input.categoryId !== oldCategoryId) {
    await Promise.all([
      refreshCategoryProductCount(oldCategoryId),
      refreshCategoryProductCount(input.categoryId),
    ]);
  }

  return doc.toJSON();
}

// ---------- DELETE / RESTORE ----------

export async function softDeleteProduct(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid product id.');
  const doc = await Product.findOne({ _id: id, deletedAt: null });
  if (!doc) throw ApiError.notFound('Product not found.');
  doc.deletedAt = new Date();
  await doc.save();
  await refreshCategoryProductCount(doc.categoryId.toString());
}

export async function restoreProduct(id: string): Promise<unknown> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid product id.');
  const doc = await Product.findById(id);
  if (!doc) throw ApiError.notFound('Product not found.');
  if (!doc.deletedAt) throw ApiError.badRequest('Product is not deleted.');
  // Category must still exist and be live
  const cat = await Category.findOne({ _id: doc.categoryId, deletedAt: null }).lean();
  if (!cat) throw ApiError.badRequest('Category is not available. Move the product first.');
  doc.slug = await uniqueSlug(Product, doc.name, { deletedAt: null }, doc._id.toString());
  doc.deletedAt = null;
  await doc.save();
  await refreshCategoryProductCount(doc.categoryId.toString());
  return doc.toJSON();
}

/**
 * Permanent hard delete — used by the scheduled trash purge job (30-day rule).
 * Also removes all Cloudinary assets.
 */
export async function hardDeleteProduct(id: string): Promise<void> {
  const doc = await Product.findById(id);
  if (!doc) return;
  await Promise.allSettled(doc.images.map((i) => deleteCloudinaryImage(i.publicId)));
  await doc.deleteOne();
}

// ---------- LISTING ----------

export interface ListProductsParams {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  status?: ProductStatus | 'all';
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  minPrice?: number;
  maxPrice?: number;
  includeDeleted?: boolean;
  sort?: string; // "field:asc,field:desc"
  page?: number;
  limit?: number;
}

async function resolveCategoryId(params: ListProductsParams): Promise<string | undefined> {
  if (params.categoryId) return params.categoryId;
  if (params.categorySlug) {
    const c = await Category.findOne({
      slug: params.categorySlug.toLowerCase(),
      deletedAt: null,
    }).lean();
    return c ? String(c._id) : '___none___';
  }
  return undefined;
}

async function listInternal(
  params: ListProductsParams,
  publicOnly: boolean,
): Promise<{
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(60, Math.max(1, Number(params.limit ?? 24)));

  const filter: Record<string, unknown> = {};
  if (publicOnly || !params.includeDeleted) filter.deletedAt = null;
  if (publicOnly) {
    // Use explicit $or to work around Mongoose enum casting quirks with $in
    // when there are legacy documents missing the `status` field.
    filter.$or = [
      { status: 'available' },
      { status: 'out_of_stock' },
    ];
  } else if (params.status && params.status !== 'all') {
    filter.status = String(params.status);
  }
  const catId = await resolveCategoryId(params);
  if (catId === '___none___') {
    return { items: [], total: 0, page, limit, pages: 1 };
  }
  if (catId) filter.categoryId = catId;
  if (params.featured) filter.featured = true;
  if (params.trending) filter.trending = true;
  if (params.newArrival) filter.newArrival = true;
  if (params.bestSeller) filter.bestSeller = true;
  if (params.minPrice != null || params.maxPrice != null) {
    const range: Record<string, number> = {};
    if (params.minPrice != null) range.$gte = params.minPrice;
    if (params.maxPrice != null) range.$lte = params.maxPrice;
    filter.minPrice = range;
  }
  if (params.q && params.q.trim()) {
    filter.$text = { $search: params.q.trim() };
  }

  const sort = parseSort(params.sort) ?? { createdAt: -1 };
  const [rawItems, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  const items = rawItems.map((p) => (publicOnly ? publicShape(p) : adminShape(p)));
  return {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function listProductsAdmin(params: ListProductsParams): ReturnType<typeof listInternal> {
  return listInternal(params, false);
}
export function listProductsPublic(params: ListProductsParams): ReturnType<typeof listInternal> {
  return listInternal(params, true);
}

export async function getProductBySlug(slug: string): Promise<unknown> {
  const p = await Product.findOne({
    slug: slug.toLowerCase(),
    deletedAt: null,
    // Explicit $or avoids the Mongoose enum casting quirk that treats
    // `{ status: { $in: [...] } }` as a scalar cast against the enum path.
    $or: [
      { status: 'available' },
      { status: 'out_of_stock' },
      { status: 'coming_soon' },
    ],
  })
    .populate('categoryId', 'name slug')
    .lean();
  if (!p) throw ApiError.notFound('Product not found.');
  return fullPublicShape(p);
}

export async function getRelatedProducts(
  slug: string,
  limit = 8,
): Promise<unknown[]> {
  const base = await Product.findOne({ slug: slug.toLowerCase(), deletedAt: null }).lean();
  if (!base) return [];
  // Defensively cast both ids to ObjectId. Mongoose 8 sometimes returns
  // string ids from .lean() and fails to re-cast them in $ne / $eq filters,
  // producing CastError. Explicit up-front cast avoids the bug.
  let baseId: Types.ObjectId;
  let categoryId: Types.ObjectId;
  try {
    baseId =
      base._id instanceof Types.ObjectId
        ? base._id
        : new Types.ObjectId(String(base._id));
    categoryId =
      base.categoryId instanceof Types.ObjectId
        ? base.categoryId
        : new Types.ObjectId(String(base.categoryId));
  } catch {
    return [];
  }
  const items = await Product.find({
    _id: { $ne: baseId },
    categoryId,
    deletedAt: null,
    $or: [{ status: 'available' }, { status: 'out_of_stock' }],
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(24, Math.max(1, limit)))
    .lean();
  return items.map(publicShape);
}

export async function getAdminProduct(id: string): Promise<unknown> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid product id.');
  const p = await Product.findById(id).populate('categoryId', 'name slug').lean();
  if (!p) throw ApiError.notFound('Product not found.');
  return adminShape(p);
}

// ---------- helpers ----------

function parseSort(sort?: string): Record<string, 1 | -1> | null {
  if (!sort) return null;
  const out: Record<string, 1 | -1> = {};
  for (const token of sort.split(',')) {
    const [field, dir] = token.split(':');
    if (!field) continue;
    out[field.trim()] = dir?.trim().toLowerCase() === 'asc' ? 1 : -1;
  }
  return Object.keys(out).length ? out : null;
}

function primary(p: Record<string, unknown>): Record<string, unknown> | null {
  const vs = p.sizeVariations as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(vs) || vs.length === 0) return null;
  return (vs.find((v) => v.isPrimary) ?? vs[0]) as Record<string, unknown>;
}

function publicShape(p: Record<string, unknown>): Record<string, unknown> {
  const pv = primary(p);
  const price = pv ? Number(pv.price ?? 0) : 0;
  const discount = pv ? Number(pv.discountPercent ?? 0) : 0;
  const net = Math.round(price * (1 - discount / 100) * 100) / 100;
  const images = (p.images as Array<{ url: string; publicId: string; order: number }> | undefined) ?? [];
  images.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    id: String((p as { _id: unknown })._id),
    name: p.name,
    slug: p.slug,
    categoryId: String(p.categoryId),
    primaryImage: images[0]?.url ?? '',
    images: images.map((i) => ({ url: i.url, order: i.order })),
    primarySize: pv?.size ?? '',
    price,
    discountPercent: discount,
    netPrice: net,
    minPrice: p.minPrice,
    maxDiscountPercent: p.maxDiscountPercent,
    totalStock: p.totalStock,
    featured: p.featured,
    trending: p.trending,
    newArrival: p.newArrival,
    bestSeller: p.bestSeller,
    status: p.status,
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
  };
}

function fullPublicShape(p: Record<string, unknown>): Record<string, unknown> {
  const base = publicShape(p);
  const cat = p.categoryId as Record<string, unknown> | string;
  return {
    ...base,
    description: p.description,
    material: p.material,
    origin: p.origin,
    shape: p.shape,
    color: p.color,
    weightKg: p.weightKg,
    pileHeightMm: p.pileHeightMm,
    knotDensity: p.knotDensity,
    construction: p.construction,
    careInstructions: p.careInstructions,
    shippingInfo: p.shippingInfo,
    warranty: p.warranty,
    sizeVariations: p.sizeVariations,
    tags: p.tags,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    category:
      typeof cat === 'object' && cat !== null
        ? {
            id: String((cat as { _id?: unknown })._id ?? ''),
            name: (cat as { name?: string }).name,
            slug: (cat as { slug?: string }).slug,
          }
        : undefined,
  };
}

function adminShape(p: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = p as { _id: unknown } & Record<string, unknown>;
  const cat = rest.categoryId as Record<string, unknown> | string;
  return {
    id: String(_id),
    ...rest,
    categoryId:
      typeof cat === 'object' && cat !== null
        ? String((cat as { _id?: unknown })._id ?? '')
        : String(cat),
    category:
      typeof cat === 'object' && cat !== null
        ? {
            id: String((cat as { _id?: unknown })._id ?? ''),
            name: (cat as { name?: string }).name,
            slug: (cat as { slug?: string }).slug,
          }
        : undefined,
  };
}
