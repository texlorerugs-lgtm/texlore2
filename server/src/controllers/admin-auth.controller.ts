/**
 * Admin auth controllers — 5-factor login + refresh + logout.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  preLogin,
  completeLogin,
  rotateAdminRefreshToken,
  revokeAdminRefreshToken,
} from '@/services/admin-auth.service';
import {
  REFRESH_COOKIE_ADMIN,
  clearRefreshCookie,
  setRefreshCookie,
} from '@/helpers/cookies';
import { Admin } from '@/models/Admin.model';

function reqMeta(req: Request): { ip: string; userAgent: string } {
  return {
    ip: (req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.ip ?? '').trim(),
    userAgent: req.headers['user-agent'] ?? '',
  };
}

export const adminPreLogin = asyncHandler(async (req: Request, res: Response) => {
  const meta = reqMeta(req);
  const { email, expiresAt } = await preLogin({ ...req.body, ...meta });
  ok(res, { email, expiresAt }, 'Verification code sent to admin email.');
});

export const adminCompleteLogin = asyncHandler(async (req: Request, res: Response) => {
  const meta = reqMeta(req);
  const { admin, accessToken, refreshToken, refreshExp } = await completeLogin({
    email: req.body.email,
    code: req.body.code,
    ...meta,
  });
  setRefreshCookie(
    res,
    REFRESH_COOKIE_ADMIN,
    refreshToken,
    Math.max(0, refreshExp.getTime() - Date.now()),
  );
  ok(res, { admin, accessToken }, 'Admin signed in.');
});

export const adminRefresh = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.signedCookies?.[REFRESH_COOKIE_ADMIN];
  if (!presented) throw ApiError.unauthorized('No admin refresh token.');
  const meta = reqMeta(req);
  const { accessToken, refreshToken, refreshExp } = await rotateAdminRefreshToken(
    presented,
    meta,
  );
  setRefreshCookie(
    res,
    REFRESH_COOKIE_ADMIN,
    refreshToken,
    Math.max(0, refreshExp.getTime() - Date.now()),
  );
  ok(res, { accessToken }, 'Admin session refreshed.');
});

export const adminLogout = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.signedCookies?.[REFRESH_COOKIE_ADMIN];
  await revokeAdminRefreshToken(presented);
  clearRefreshCookie(res, REFRESH_COOKIE_ADMIN);
  ok(res, null, 'Admin signed out.');
});

export const adminMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) throw ApiError.unauthorized();
  const admin = await Admin.findById(req.admin.id);
  if (!admin) throw ApiError.notFound('Admin not found.');
  ok(res, { admin: admin.toJSON() }, 'OK');
});
