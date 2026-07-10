/**
 * express-validator harness — flattens errors into the standard envelope.
 * Usage:
 *   router.post('/foo', [body('x').isString(), validate], controller.foo);
 *
 * When a validation error fires we log the offending fields + values (dev
 * mode only) so root-causing is a single glance at the terminal.
 */
import type { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/utils/logger';
import { isDev } from '@/config/env';

export const validate: RequestHandler = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({
    field: (e as { path?: string }).path ?? 'unknown',
    message: e.msg,
    value: isDev ? (e as { value?: unknown }).value : undefined,
  }));
  if (isDev) {
    logger.warn(`Validation failed ${req.method} ${req.originalUrl}`, { errors });
  }
  return next(ApiError.badRequest('Validation failed.', errors));
};
