import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok, created } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  createCoupon,
  updateCoupon,
  softDeleteCoupon,
  restoreCoupon,
  listCouponsAdmin,
  getCouponById,
  validateAndComputeCoupon,
} from '@/services/coupon.service';
import { buildCartSnapshot } from '@/services/cart.service';

function uid(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

// User-facing: validate a coupon against the current cart WITHOUT applying it.
export const postValidateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const snap = await buildCartSnapshot(uid(req));
  if (snap.items.length === 0) throw ApiError.badRequest('Your cart is empty.');
  const result = await validateAndComputeCoupon({
    code: String(req.body.code),
    userId: uid(req),
    subtotal: snap.subtotal,
    lines: snap.items.map((l) => ({
      productId: l.productId,
      categoryId: l.categoryId,
      lineTotal: l.lineTotal,
    })),
  });
  ok(res, { coupon: result }, 'Coupon is valid for this cart.');
});

// ----- Admin CRUD -----
export const adminCreateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const c = await createCoupon(req.body, req.admin?.id);
  created(res, { coupon: c }, 'Coupon created.');
});
export const adminUpdateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const c = await updateCoupon(req.params.id, req.body);
  ok(res, { coupon: c }, 'Coupon updated.');
});
export const adminDeleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  await softDeleteCoupon(req.params.id);
  ok(res, null, 'Coupon deleted.');
});
export const adminRestoreCoupon = asyncHandler(async (req: Request, res: Response) => {
  const c = await restoreCoupon(req.params.id);
  ok(res, { coupon: c }, 'Coupon restored.');
});
export const adminListCoupons = asyncHandler(async (req: Request, res: Response) => {
  const data = await listCouponsAdmin({
    q: req.query.q as string | undefined,
    isActive: req.query.isActive as unknown as boolean,
    includeDeleted: req.query.includeDeleted as unknown as boolean,
    sort: req.query.sort as string | undefined,
    page: req.query.page as unknown as number,
    limit: req.query.limit as unknown as number,
  });
  ok(res, data, 'OK');
});
export const adminGetCoupon = asyncHandler(async (req: Request, res: Response) => {
  const c = await getCouponById(req.params.id);
  ok(res, { coupon: c }, 'OK');
});
