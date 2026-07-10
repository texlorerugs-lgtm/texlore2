import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  buildCartSnapshot,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
} from '@/services/cart.service';

function uid(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const snap = await buildCartSnapshot(uid(req), { writeBack: true });
  ok(res, { cart: snap }, 'OK');
});

export const postAddToCart = asyncHandler(async (req: Request, res: Response) => {
  const snap = await addToCart(uid(req), {
    productId: String(req.body.productId),
    sizeVariationId: String(req.body.sizeVariationId),
    quantity: Number(req.body.quantity),
  });
  ok(res, { cart: snap }, 'Added to cart.');
});

export const patchCartItem = asyncHandler(async (req: Request, res: Response) => {
  const snap = await updateCartItem(uid(req), req.params.itemId, Number(req.body.quantity));
  ok(res, { cart: snap }, 'Cart updated.');
});

export const deleteCartItem = asyncHandler(async (req: Request, res: Response) => {
  const snap = await removeCartItem(uid(req), req.params.itemId);
  ok(res, { cart: snap }, 'Item removed.');
});

export const postClearCart = asyncHandler(async (req: Request, res: Response) => {
  const snap = await clearCart(uid(req));
  ok(res, { cart: snap }, 'Cart cleared.');
});

export const postApplyCoupon = asyncHandler(async (req: Request, res: Response) => {
  const snap = await applyCoupon(uid(req), String(req.body.code));
  ok(res, { cart: snap }, 'Coupon applied.');
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const snap = await removeCoupon(uid(req));
  ok(res, { cart: snap }, 'Coupon removed.');
});
