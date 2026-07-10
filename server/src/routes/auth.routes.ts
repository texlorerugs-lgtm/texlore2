/**
 * /api/v1/auth  — user authentication routes.
 * All state-changing endpoints use the auth rate limiter.
 */
import { Router } from 'express';
import { authRateLimiter, otpRateLimiter } from '@/middlewares/rateLimiter';
import { validate } from '@/middlewares/validate';
import { requireUser } from '@/middlewares/auth';
import {
  signupRequestValidators,
  signupVerifyValidators,
  resendOtpValidators,
  loginValidators,
  forgotRequestValidators,
  forgotResetValidators,
} from '@/validators/auth.validator';
import {
  signupRequest,
  signupVerify,
  resendOtp,
  login,
  refresh,
  logout,
  me,
  forgotRequest,
  forgotReset,
} from '@/controllers/auth.controller';

const router = Router();

router.post('/signup/request', authRateLimiter, signupRequestValidators, validate, signupRequest);
router.post('/signup/verify', authRateLimiter, signupVerifyValidators, validate, signupVerify);
router.post('/signup/resend', otpRateLimiter, resendOtpValidators, validate, resendOtp);

router.post('/login', authRateLimiter, loginValidators, validate, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireUser, me);

router.post('/forgot/request', otpRateLimiter, forgotRequestValidators, validate, forgotRequest);
router.post('/forgot/reset', authRateLimiter, forgotResetValidators, validate, forgotReset);

export default router;
