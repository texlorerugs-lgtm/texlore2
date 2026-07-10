/**
 * JWT issuance + verification for access and refresh tokens.
 * Access tokens live in memory / Authorization header.
 * Refresh tokens live in an httpOnly, signed, SameSite cookie.
 */
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '@/config/env';

export type TokenAudience = 'user' | 'admin';

export interface AccessTokenPayload {
  sub: string; // subject = user/admin id
  aud: TokenAudience;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  aud: TokenAudience;
  jti: string; // token id — stored server-side for rotation/revocation
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const opts: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const opts: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
