/**
 * Admin authentication — the 5-factor flow (Part 3).
 *
 * Login sequence:
 *   Step 1: preLogin  — verify Name + Email + Password + Secret Key, then send OTP
 *   Step 2: completeLogin — verify OTP, issue tokens
 *
 * Enforces:
 *   - 5 failed attempts -> lock for 15 minutes
 *   - Password + Secret Key both bcrypt-hashed
 *   - Case-insensitive email + case-sensitive name match
 *   - Separate refresh tokens (audience='admin')
 */
import { randomUUID } from 'node:crypto';
import { Admin } from '@/models/Admin.model';
import { RefreshToken } from '@/models/RefreshToken.model';
import { ApiError } from '@/utils/ApiError';
import { comparePassword } from '@/helpers/password';
import { issueOtp, verifyOtp } from '@/services/otp.service';
import { sendOtpEmail } from '@/services/email.service';
import { env } from '@/config/env';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/helpers/jwt';
import { logger } from '@/utils/logger';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isLocked(admin: { accountLockedUntil?: Date | null }): boolean {
  return !!admin.accountLockedUntil && admin.accountLockedUntil.getTime() > Date.now();
}

/**
 * STEP 1 — verify all four static factors and email the OTP.
 * Returns nothing sensitive: on success the client is told an OTP has been sent.
 */
export async function preLogin(input: {
  name: string;
  email: string;
  password: string;
  secretKey: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ email: string; expiresAt: Date }> {
  const email = input.email.toLowerCase().trim();
  const admin = await Admin.findOne({ email }).select('+passwordHash +secretKeyHash');

  // Uniform failure to prevent user-enumeration
  const genericFail = ApiError.unauthorized('Invalid admin credentials.');

  if (!admin || !admin.isActive) throw genericFail;
  if (isLocked(admin)) {
    const mins = Math.ceil(
      ((admin.accountLockedUntil?.getTime() ?? 0) - Date.now()) / 60_000,
    );
    throw ApiError.forbidden(`Admin login is locked. Try again in ${mins} minute(s).`);
  }

  // Name must match exactly (case-insensitive to be forgiving of caps lock).
  const nameMatch = admin.name.trim().toLowerCase() === input.name.trim().toLowerCase();
  const pwdMatch = await comparePassword(input.password, admin.passwordHash);
  const keyMatch = await comparePassword(input.secretKey, admin.secretKeyHash);

  if (!nameMatch || !pwdMatch || !keyMatch) {
    admin.failedAttempts += 1;
    admin.loginHistory.push({
      at: new Date(),
      ip: input.ip,
      userAgent: input.userAgent,
      success: false,
      reason: !nameMatch ? 'name' : !pwdMatch ? 'password' : 'secretKey',
    });
    if (admin.failedAttempts >= env.ADMIN_MAX_FAILED_ATTEMPTS) {
      admin.accountLockedUntil = new Date(Date.now() + env.ADMIN_LOCKOUT_MINUTES * 60_000);
      admin.failedAttempts = 0;
      logger.warn(`Admin ${email} locked out after repeated failures`);
    }
    await admin.save();
    throw genericFail;
  }

  // Static factors OK — issue OTP.
  const { code, expiresAt } = await issueOtp({
    identifier: email,
    purpose: 'admin_login',
    payload: { adminId: admin._id.toString() },
  });
  const result = await sendOtpEmail({
    to: email,
    name: admin.name,
    otp: code,
    purpose: 'admin_login',
  });
  if (!result.ok) throw ApiError.internal('Could not send admin login code. Try again.');

  return { email, expiresAt };
}

/**
 * STEP 2 — verify OTP and issue admin tokens.
 */
export async function completeLogin(input: {
  email: string;
  code: string;
  ip?: string;
  userAgent?: string;
}): Promise<{
  admin: unknown;
  accessToken: string;
  refreshToken: string;
  refreshJti: string;
  refreshExp: Date;
}> {
  const email = input.email.toLowerCase().trim();
  const { payload } = await verifyOtp({
    identifier: email,
    purpose: 'admin_login',
    code: input.code,
  });
  const adminId = (payload as { adminId?: string } | null)?.adminId;
  if (!adminId) throw ApiError.badRequest('Admin login session expired. Please start over.');

  const admin = await Admin.findById(adminId);
  if (!admin || !admin.isActive) throw ApiError.unauthorized('Admin account unavailable.');

  admin.failedAttempts = 0;
  admin.accountLockedUntil = null;
  admin.lastLoginAt = new Date();
  admin.lastLoginIp = input.ip;
  admin.loginHistory.push({
    at: new Date(),
    ip: input.ip,
    userAgent: input.userAgent,
    success: true,
    reason: 'ok',
  });
  // Cap history to last 20 — splice-in-place to keep the DocumentArray type
  if (admin.loginHistory.length > 20) {
    admin.loginHistory.splice(0, admin.loginHistory.length - 20);
  }
  await admin.save();

  const jti = randomUUID();
  const accessToken = signAccessToken({
    sub: admin._id.toString(),
    aud: 'admin',
    email: admin.email,
    role: admin.role,
  });
  const refreshToken = signRefreshToken({
    sub: admin._id.toString(),
    aud: 'admin',
    jti,
  });
  const refreshExp = new Date(Date.now() + REFRESH_TTL_MS);
  await RefreshToken.create({
    jti,
    audience: 'admin',
    subjectId: admin._id,
    userAgent: input.userAgent ?? '',
    ip: input.ip ?? '',
    expiresAt: refreshExp,
  });

  return { admin: admin.toJSON(), accessToken, refreshToken, refreshJti: jti, refreshExp };
}

export async function rotateAdminRefreshToken(
  presented: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<{ accessToken: string; refreshToken: string; refreshJti: string; refreshExp: Date }> {
  let decoded;
  try {
    decoded = verifyRefreshToken(presented);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token.');
  }
  if (decoded.aud !== 'admin') throw ApiError.unauthorized('Wrong token audience.');

  const record = await RefreshToken.findOne({ jti: decoded.jti });
  if (!record) throw ApiError.unauthorized('Admin session not found.');
  if (record.revokedAt) {
    await RefreshToken.updateMany(
      { audience: 'admin', subjectId: record.subjectId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    logger.warn(`Admin refresh reuse detected: ${String(record.subjectId)}`);
    throw ApiError.unauthorized('Admin session invalidated.');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized('Admin session expired.');
  }

  const admin = await Admin.findById(record.subjectId);
  if (!admin || !admin.isActive) throw ApiError.unauthorized('Admin unavailable.');

  const newJti = randomUUID();
  const accessToken = signAccessToken({
    sub: admin._id.toString(),
    aud: 'admin',
    email: admin.email,
    role: admin.role,
  });
  const refreshToken = signRefreshToken({
    sub: admin._id.toString(),
    aud: 'admin',
    jti: newJti,
  });
  const refreshExp = new Date(Date.now() + REFRESH_TTL_MS);
  await RefreshToken.create({
    jti: newJti,
    audience: 'admin',
    subjectId: admin._id,
    userAgent: meta.userAgent ?? '',
    ip: meta.ip ?? '',
    expiresAt: refreshExp,
  });
  record.revokedAt = new Date();
  record.replacedBy = newJti;
  await record.save();

  return { accessToken, refreshToken, refreshJti: newJti, refreshExp };
}

export async function revokeAdminRefreshToken(presented: string | undefined): Promise<void> {
  if (!presented) return;
  try {
    const decoded = verifyRefreshToken(presented);
    await RefreshToken.updateOne(
      { jti: decoded.jti, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  } catch {
    // ignore
  }
}
