/**
 * Rate limiters. Two profiles:
 *   - global: applies to all API routes
 *   - auth:   stricter, applied to /auth/*, /admin/login, OTP, etc.
 */
import rateLimit from 'express-rate-limit';
import { env } from '@/config/env';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please slow down.',
    data: null,
    errors: null,
  },
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Try again later.',
    data: null,
    errors: null,
  },
});

export const otpRateLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait a minute.',
    data: null,
    errors: null,
  },
});
