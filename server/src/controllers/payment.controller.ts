import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok, created, fail } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  createGatewayOrder,
  verifyAndFulfil,
  markPaymentFailed,
  handleWebhook,
} from '@/services/payment.service';
import { logger } from '@/utils/logger';

function uid(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

export const postCreateGatewayOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await createGatewayOrder({
    userId: uid(req),
    addressId: String(req.body.addressId),
  });
  created(res, result, 'Payment order created. Open Razorpay Checkout.');
});

export const postVerifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await verifyAndFulfil({
    userId: uid(req),
    gatewayOrderId: String(req.body.gatewayOrderId),
    gatewayPaymentId: String(req.body.gatewayPaymentId),
    signature: String(req.body.signature),
  });
  ok(res, result, 'Payment verified and order created.');
});

export const postFailPayment = asyncHandler(async (req: Request, res: Response) => {
  await markPaymentFailed({
    userId: uid(req),
    gatewayOrderId: String(req.body.gatewayOrderId),
    reason: req.body.reason ? String(req.body.reason) : undefined,
  });
  ok(res, null, 'Payment marked failed.');
});

/**
 * Razorpay webhook. Body must be the raw buffer (see the raw-body branch
 * we registered in app.ts). Any 2xx counts as delivered — we never leak
 * error details to Razorpay's dashboard.
 */
export const postWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = String(req.headers['x-razorpay-signature'] ?? '');
  if (!signature) {
    fail(res, 'Missing signature', 400);
    return;
  }
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    fail(res, 'Expected raw body', 400);
    return;
  }
  try {
    await handleWebhook(raw, signature);
    ok(res, null, 'ok');
  } catch (err) {
    // We deliberately log and 200 for anything below signature-verified so
    // Razorpay doesn't spam retries for our own bugs; signature failures
    // return 401.
    if (err instanceof ApiError && err.status === 401) {
      fail(res, err.message, 401);
      return;
    }
    logger.error('Webhook processing error', err);
    ok(res, null, 'received');
  }
});
