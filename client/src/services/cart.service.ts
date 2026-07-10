import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';
import type { CartSnapshot } from '@/types/commerce';

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export const cartApi = {
  get: () => unwrap<{ cart: CartSnapshot }>(http.get('/cart')),

  add: (body: { productId: string; sizeVariationId: string; quantity: number }) =>
    unwrap<{ cart: CartSnapshot }>(http.post('/cart/items', body)),

  updateQty: (itemId: string, quantity: number) =>
    unwrap<{ cart: CartSnapshot }>(http.patch(`/cart/items/${itemId}`, { quantity })),

  remove: (itemId: string) =>
    unwrap<{ cart: CartSnapshot }>(http.delete(`/cart/items/${itemId}`)),

  clear: () => unwrap<{ cart: CartSnapshot }>(http.post('/cart/clear')),

  applyCoupon: (code: string) =>
    unwrap<{ cart: CartSnapshot }>(http.post('/cart/coupon', { code })),

  removeCoupon: () => unwrap<{ cart: CartSnapshot }>(http.delete('/cart/coupon')),
};
