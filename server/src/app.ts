/**
 * Express application composition.
 * Wire up: security -> parsers -> logging -> rate limit -> routes -> errors.
 * All routes are mounted under /api/v1.
 */
import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';

import { env, isProd } from '@/config/env';
import { applySecurity } from '@/middlewares/security';
import { globalRateLimiter } from '@/middlewares/rateLimiter';
import { errorHandler, notFoundHandler } from '@/middlewares/errorHandler';
import { ok } from '@/utils/apiResponse';
import { logger } from '@/utils/logger';
import authRoutes from '@/routes/auth.routes';
import adminAuthRoutes from '@/routes/admin-auth.routes';
import {
  categoryAdminRouter,
  categoryPublicRouter,
} from '@/routes/category.routes';
import {
  productAdminRouter,
  productPublicRouter,
} from '@/routes/product.routes';
import cartRoutes from '@/routes/cart.routes';
import addressRoutes from '@/routes/address.routes';
import { couponAdminRouter } from '@/routes/coupon.routes';
import {
  contactAdminRouter,
  contactPublicRouter,
} from '@/routes/contact.routes';
import {
  paymentUserRouter,
  paymentWebhookRouter,
} from '@/routes/payment.routes';
import {
  orderAdminRouter,
  orderUserRouter,
} from '@/routes/order.routes';
import {
  adminAnalyticsRouter,
  adminCustomersRouter,
} from '@/routes/admin-analytics.routes';

export function createApp(): Application {
  const app = express();

  // Trust proxy — required for correct rate-limit IP detection behind Render/Nginx
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security
  applySecurity(app);

  // CORS — allow the configured client origin and admin (same origin)
  app.use(
    cors({
      origin: [env.CLIENT_URL],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // Body parsers — keep raw body available for Razorpay webhooks
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // Perf
  app.use(compression());

  // Request logging
  app.use(
    morgan(isProd ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.http?.(msg.trim()) ?? logger.info(msg.trim()) },
    }),
  );

  // Global rate limit — auth-specific limiter is applied at route level
  app.use('/api/', globalRateLimiter);

  // Health checks
  app.get('/health', (_req: Request, res: Response) => {
    ok(res, { status: 'ok', ts: new Date().toISOString() }, 'Texlore API is healthy');
  });
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    ok(res, { status: 'ok', version: 'v1' }, 'API v1 ready');
  });

  // Route mounts
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin/auth', adminAuthRoutes);
  // M3
  app.use('/api/v1/categories', categoryPublicRouter);
  app.use('/api/v1/products', productPublicRouter);
  app.use('/api/v1/admin/categories', categoryAdminRouter);
  app.use('/api/v1/admin/products', productAdminRouter);
  // M4
  app.use('/api/v1/cart', cartRoutes);
  app.use('/api/v1/addresses', addressRoutes);
  app.use('/api/v1/contact', contactPublicRouter);
  app.use('/api/v1/admin/coupons', couponAdminRouter);
  app.use('/api/v1/admin/contact', contactAdminRouter);
  // M5 — payments + orders
  // The webhook router MUST be mounted at /api/v1/payments so the raw-body
  // branch registered above (`app.use('/api/v1/payments/webhook', ...)`) is
  // in effect for that exact path. paymentUserRouter's own /webhook path is
  // avoided by design — the two routers don't collide.
  app.use('/api/v1/payments', paymentWebhookRouter);
  app.use('/api/v1/payments', paymentUserRouter);
  app.use('/api/v1/orders', orderUserRouter);
  app.use('/api/v1/admin/orders', orderAdminRouter);
  // M7 — admin dashboard endpoints
  app.use('/api/v1/admin/analytics', adminAnalyticsRouter);
  app.use('/api/v1/admin/customers', adminCustomersRouter);
  // TODO(M3+): categories, products, uploads
  // TODO(M4+): cart, address, coupon, contact
  // TODO(M5+): payments, orders, webhooks

  // 404 + error handler (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
