/**
 * Standard API response envelope enforced by Part 4:
 *   { success, message, data, errors }
 * Every controller must use these helpers.
 */
import type { Response } from 'express';

export interface ApiSuccess<T = unknown> {
  success: true;
  message: string;
  data: T;
  errors: null;
}

export interface ApiFailure {
  success: false;
  message: string;
  data: null;
  errors: unknown[] | null;
}

export function ok<T>(res: Response, data: T, message = 'OK', status = 200): Response {
  const body: ApiSuccess<T> = { success: true, message, data, errors: null };
  return res.status(status).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return ok(res, data, message, 201);
}

export function fail(
  res: Response,
  message: string,
  status = 400,
  errors: unknown[] | null = null,
): Response {
  const body: ApiFailure = { success: false, message, data: null, errors };
  return res.status(status).json(body);
}
