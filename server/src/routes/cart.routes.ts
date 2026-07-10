import { Router } from 'express';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import {
  addToCartValidators,
  updateCartValidators,
  itemIdParam,
  couponValidators,
} from '@/validators/cart.validator';
import {
  getCart,
  postAddToCart,
  patchCartItem,
  deleteCartItem,
  postClearCart,
  postApplyCoupon,
  deleteCoupon,
} from '@/controllers/cart.controller';
import { postValidateCoupon } from '@/controllers/coupon.controller';

const router = Router();
router.use(requireUser);

router.get('/', getCart);
router.post('/items', addToCartValidators, validate, postAddToCart);
router.patch('/items/:itemId', updateCartValidators, validate, patchCartItem);
router.delete('/items/:itemId', itemIdParam, validate, deleteCartItem);
router.post('/clear', postClearCart);

router.post('/coupon', couponValidators, validate, postApplyCoupon);
router.delete('/coupon', deleteCoupon);
router.post('/coupon/validate', couponValidators, validate, postValidateCoupon);

export default router;
