/**
 * Admin CRUD API for categories + products.
 * All requests carry `audience: 'admin'` so the http interceptor uses the
 * admin access token and admin refresh flow.
 */
import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';
import type { CategoryPublic, Paginated } from '@/types/catalog';

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export interface AdminCategory extends CategoryPublic {
  status: 'active' | 'hidden' | 'archived';
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  status?: 'active' | 'hidden' | 'archived';
  priority?: number;
  seoTitle?: string;
  seoDescription?: string;
  imageFile?: File;
}

function toFormData(data: CategoryFormData): FormData {
  const fd = new FormData();
  fd.append('name', data.name);
  if (data.description !== undefined) fd.append('description', data.description);
  if (data.status !== undefined) fd.append('status', data.status);
  if (data.priority !== undefined) fd.append('priority', String(data.priority));
  if (data.seoTitle !== undefined) fd.append('seoTitle', data.seoTitle);
  if (data.seoDescription !== undefined) fd.append('seoDescription', data.seoDescription);
  if (data.imageFile) fd.append('image', data.imageFile);
  return fd;
}

export const adminCategoryApi = {
  list: (params: {
    q?: string;
    status?: string;
    includeDeleted?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    unwrap<Paginated<AdminCategory>>(
      http.get('/admin/categories', { params, audience: 'admin' }),
    ),

  get: (id: string) =>
    unwrap<{ category: AdminCategory }>(
      http.get(`/admin/categories/${id}`, { audience: 'admin' }),
    ),

  deleteImpact: (id: string) =>
    unwrap<{ productCount: number }>(
      http.get(`/admin/categories/${id}/delete-impact`, { audience: 'admin' }),
    ),

  create: (data: CategoryFormData) =>
    unwrap<{ category: AdminCategory }>(
      http.post('/admin/categories', toFormData(data), {
        audience: 'admin',
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),

  update: (id: string, data: CategoryFormData) =>
    unwrap<{ category: AdminCategory }>(
      http.patch(`/admin/categories/${id}`, toFormData(data), {
        audience: 'admin',
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),

  delete: (
    id: string,
    body: { mode: 'empty' | 'move' | 'cascade'; targetCategoryId?: string },
  ) =>
    unwrap<{ moved?: number; softDeleted?: number }>(
      http.post(`/admin/categories/${id}/delete`, body, { audience: 'admin' }),
    ),

  restore: (id: string) =>
    unwrap<{ category: AdminCategory }>(
      http.post(`/admin/categories/${id}/restore`, {}, { audience: 'admin' }),
    ),
};

// ---------- Products ----------

export interface AdminSizeVariation {
  size: string;
  sku?: string;
  price: number;
  discountPercent?: number;
  stock: number;
  weightKg?: number;
  isPrimary?: boolean;
}

export interface ProductFormData {
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
  sizeVariations: AdminSizeVariation[];
  status?:
    | 'available'
    | 'out_of_stock'
    | 'hidden'
    | 'coming_soon'
    | 'discontinued';
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  /** Files to add as new images. */
  newImageFiles?: File[];
  /** publicIds of existing images to remove (update only). */
  removeImagePublicIds?: string[];
  /** publicIds in desired display order (update only). */
  reorderPublicIds?: string[];
}

function toProductFormData(data: ProductFormData): FormData {
  const fd = new FormData();
  const { newImageFiles, ...rest } = data;
  fd.append('payload', JSON.stringify(rest));
  (newImageFiles ?? []).forEach((f) => fd.append('images', f));
  return fd;
}

export const adminProductApi = {
  list: (params: {
    q?: string;
    categoryId?: string;
    status?: string;
    includeDeleted?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    unwrap<Paginated<Record<string, unknown>>>(
      http.get('/admin/products', { params, audience: 'admin' }),
    ),

  get: (id: string) =>
    unwrap<{ product: Record<string, unknown> }>(
      http.get(`/admin/products/${id}`, { audience: 'admin' }),
    ),

  create: (data: ProductFormData) =>
    unwrap<{ product: Record<string, unknown> }>(
      http.post('/admin/products', toProductFormData(data), {
        audience: 'admin',
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),

  update: (id: string, data: ProductFormData) =>
    unwrap<{ product: Record<string, unknown> }>(
      http.patch(`/admin/products/${id}`, toProductFormData(data), {
        audience: 'admin',
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),

  softDelete: (id: string) =>
    http.post(`/admin/products/${id}/delete`, {}, { audience: 'admin' }),

  restore: (id: string) =>
    unwrap<{ product: Record<string, unknown> }>(
      http.post(`/admin/products/${id}/restore`, {}, { audience: 'admin' }),
    ),
};
