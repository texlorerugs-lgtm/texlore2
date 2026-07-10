import { Router } from 'express';
import { requireAdmin, requirePermission } from '@/middlewares/admin';
import { validate } from '@/middlewares/validate';
import {
  createCouponValidators,
  updateCouponValidators,
  idParam,
  listCouponValidators,
} from '@/validators/coupon.validator';
import {
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
  adminRestoreCoupon,
  adminListCoupons,
  adminGetCoupon,
} from '@/controllers/coupon.controller';

export const couponAdminRouter = Router();
couponAdminRouter.use(requireAdmin, requirePermission('coupon:manage'));

couponAdminRouter.get('/', listCouponValidators, validate, adminListCoupons);
couponAdminRouter.get('/:id', idParam, validate, adminGetCoupon);
couponAdminRouter.post('/', createCouponValidators, validate, adminCreateCoupon);
couponAdminRouter.patch('/:id', updateCouponValidators, validate, adminUpdateCoupon);
couponAdminRouter.post('/:id/delete', idParam, validate, adminDeleteCoupon);
couponAdminRouter.post('/:id/restore', idParam, validate, adminRestoreCoupon);
