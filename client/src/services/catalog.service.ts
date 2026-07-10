/**
 * Public catalog API — categories + products (read-only).
 * Admin CRUD lives in admin-catalog.service.ts.
 */
import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';
import type {
  CategoryPublic,
  Paginated,
  ProductCardData,
  ProductDetail,
} from '@/types/catalog';

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export interface ProductListQuery {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export const catalogApi = {
  listCategories: () =>
    unwrap<{ categories: CategoryPublic[] }>(http.get('/categories')),

  getCategoryBySlug: (slug: string) =>
    unwrap<{ category: CategoryPublic }>(http.get(`/categories/${encodeURIComponent(slug)}`)),

  listProducts: (params: ProductListQuery = {}) =>
    unwrap<Paginated<ProductCardData>>(http.get('/products', { params })),

  getProductBySlug: (slug: string) =>
    unwrap<{ product: ProductDetail }>(
      http.get(`/products/${encodeURIComponent(slug)}`),
    ),

  getRelatedProducts: (slug: string, limit = 8) =>
    unwrap<{ products: ProductCardData[] }>(
      http.get(`/products/${encodeURIComponent(slug)}/related`, { params: { limit } }),
    ),
};
