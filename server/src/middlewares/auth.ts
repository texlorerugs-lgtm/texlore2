/**
 * User authentication middleware.
 * Requires a valid access JWT with audience='user'. Populates req.user.
 *
 * The admin middleware lives separately in ./admin.ts — user tokens are
 * NEVER accepted on admin routes and vice versa.
 */
import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { User } from '@/models/User.model';
import { verifyAccessToken } from '@/helpers/jwt';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

function extractBearer(header?: string): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

export const requireUser: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) throw ApiError.unauthorized('Authentication required.');

  const decoded = verifyAccessToken(token);
  if (decoded.aud !== 'user') throw ApiError.unauthorized('Invalid token audience.');

  const user = await User.findById(decoded.sub).lean();
  if (!user) throw ApiError.unauthorized('Account not found.');
  if (user.isBlocked) throw ApiError.forbidden('Account is blocked.');
  if (!user.isVerified) throw ApiError.forbidden('Account is not verified.');

  req.user = {
    id: String(user._id),
    _id: new Types.ObjectId(String(user._id)),
    email: user.email,
    name: user.name,
    role: 'user',
  };
  next();
});

/**
 * Optional variant: attaches req.user if a token is present, but does not
 * reject anonymous requests. Useful for endpoints that behave differently
 * for logged-in users (e.g. product view with personalization later).
 */
export const optionalUser: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next();
  try {
    const decoded = verifyAccessToken(token);
    if (decoded.aud !== 'user') return next();
    const user = await User.findById(decoded.sub).lean();
    if (user && user.isVerified && !user.isBlocked) {
      req.user = {
        id: String(user._id),
        _id: new Types.ObjectId(String(user._id)),
        email: user.email,
        name: user.name,
        role: 'user',
      };
    }
  } catch {
    // ignore — treat as anonymous
  }
  next();
});
