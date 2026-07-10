import { Router } from 'express';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { authRateLimiter } from '@/middlewares/rateLimiter';
import {
  createGatewayOrderValidators,
  verifyPaymentValidators,
  failPaymentValidators,
} from '@/validators/payment.validator';
import {
  postCreateGatewayOrder,
  postVerifyPayment,
  postFailPayment,
  postWebhook,
} from '@/controllers/payment.controller';

// User-facing payment routes (require login)
export const paymentUserRouter = Router();
paymentUserRouter.use(requireUser);
paymentUserRouter.post(
  '/create-order',
  authRateLimiter,
  createGatewayOrderValidators,
  validate,
  postCreateGatewayOrder,
);
paymentUserRouter.post(
  '/verify',
  authRateLimiter,
  verifyPaymentValidators,
  validate,
  postVerifyPayment,
);
paymentUserRouter.post(
  '/fail',
  failPaymentValidators,
  validate,
  postFailPayment,
);

// Webhook — no auth, uses raw body (registered in app.ts) + signature check
export const paymentWebhookRouter = Router();
paymentWebhookRouter.post('/webhook', postWebhook);
