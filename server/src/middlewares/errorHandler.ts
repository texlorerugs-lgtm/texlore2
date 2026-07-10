/**
 * Global error handler + 404 handler.
 * Never leaks stack traces, MongoDB internals, or secrets to clients.
 */
import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '@/utils/ApiError';
import { fail } from '@/utils/apiResponse';
import { logger } from '@/utils/logger';
import { isProd } from '@/config/env';

export function notFoundHandler(req: Request, res: Response): void {
  fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

// Express requires the 4-arg signature to be treated as an error middleware.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle known ApiError instances
  if (err instanceof ApiError) {
    fail(res, err.message, err.status, err.errors);
    return;
  }

  // Mongoose validation errors -> 400
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    fail(res, 'Validation failed', 400, details);
    return;
  }

  // Mongoose CastError (bad ObjectId etc.) -> 400
  if (err instanceof mongoose.Error.CastError) {
    logger.warn('Mongoose CastError', {
      path: req.originalUrl,
      field: err.path,
      value: err.value,
      kind: err.kind,
      model: (err as unknown as { model?: { modelName?: string } }).model?.modelName,
    });
    fail(res, `Invalid value for field '${err.path}'`, 400);
    return;
  }

  // Duplicate key
  if (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: number }).code === 11000
  ) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue ?? {};
    const field = Object.keys(keyValue)[0] ?? 'field';
    fail(res, `Duplicate value for ${field}`, 409);
    return;
  }

  // JWT
  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    fail(res, 'Invalid authentication token', 401);
    return;
  }
  if (err instanceof Error && err.name === 'TokenExpiredError') {
    fail(res, 'Authentication token expired', 401);
    return;
  }

  // Unknown / unexpected — log full details, never send them
  logger.error('Unhandled error', {
    path: req.originalUrl,
    method: req.method,
    err,
  });

  const message =
    isProd || !(err instanceof Error) ? 'Something went wrong' : err.message;
  fail(res, message, 500);
}
