/**
 * /api/v1/admin/auth — admin 5-factor login.
 * These routes are never linked from the storefront.
 */
import { Router } from 'express';
import { authRateLimiter } from '@/middlewares/rateLimiter';
import { validate } from '@/middlewares/validate';
import { requireAdmin } from '@/middlewares/admin';
import {
  adminPreLoginValidators,
  adminVerifyValidators,
} from '@/validators/admin-auth.validator';
import {
  adminPreLogin,
  adminCompleteLogin,
  adminRefresh,
  adminLogout,
  adminMe,
} from '@/controllers/admin-auth.controller';

const router = Router();

router.post('/login/prepare', authRateLimiter, adminPreLoginValidators, validate, adminPreLogin);
router.post('/login/verify', authRateLimiter, adminVerifyValidators, validate, adminCompleteLogin);
router.post('/refresh', adminRefresh);
router.post('/logout', adminLogout);
router.get('/me', requireAdmin, adminMe);

export default router;
