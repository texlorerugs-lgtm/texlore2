/**
 * Admin authentication + permission middleware.
 * Requires a valid access JWT with audience='admin'. Populates req.admin.
 *
 * User tokens are rejected. Permissions checked via requirePermission('...').
 */
import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { Admin } from '@/models/Admin.model';
import { verifyAccessToken } from '@/helpers/jwt';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

function extractBearer(header?: string): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

export const requireAdmin: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) throw ApiError.unauthorized('Admin authentication required.');

  const decoded = verifyAccessToken(token);
  if (decoded.aud !== 'admin') throw ApiError.forbidden('Admin access required.');

  const admin = await Admin.findById(decoded.sub).lean();
  if (!admin || !admin.isActive) throw ApiError.forbidden('Admin unavailable.');

  req.admin = {
    id: String(admin._id),
    _id: new Types.ObjectId(String(admin._id)),
    email: admin.email,
    name: admin.name,
    role: admin.role as 'admin' | 'superadmin',
    permissions: admin.permissions ?? [],
  };
  next();
});

export function requirePermission(permission: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.admin) return next(ApiError.unauthorized('Admin authentication required.'));
    if (req.admin.role === 'superadmin') return next();
    if (!req.admin.permissions.includes(permission)) {
      return next(ApiError.forbidden(`Missing permission: ${permission}`));
    }
    next();
  };
}
