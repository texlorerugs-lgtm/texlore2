/**
 * Cookie helpers for refresh tokens.
 * httpOnly + signed + SameSite=Lax(dev)/None(prod cross-origin).
 */
import type { Response, CookieOptions } from 'express';
import { isProd } from '@/config/env';

export const REFRESH_COOKIE_USER = 'tx_rt';
export const REFRESH_COOKIE_ADMIN = 'tx_art';

export function refreshCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function setRefreshCookie(
  res: Response,
  name: string,
  token: string,
  maxAgeMs: number,
): void {
  res.cookie(name, token, refreshCookieOptions(maxAgeMs));
}

export function clearRefreshCookie(res: Response, name: string): void {
  res.clearCookie(name, {
    httpOnly: true,
    signed: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}

/** Refresh token maxAge in ms — matches JWT_REFRESH_EXPIRES_IN default 7d. */
export const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
