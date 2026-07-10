/**
 * User authentication service.
 *
 * Signup flow (Part 2):
 *   1. requestSignupOtp — validate+persist encrypted OTP + pending payload
 *   2. verifySignupOtp  — create the User doc, mark verified, issue tokens
 *
 * Login: password check → issue tokens.
 * Forgot password: OTP → verify → new password → invalidate refresh tokens.
 */
import { randomUUID } from 'node:crypto';
import { User } from '@/models/User.model';
import { RefreshToken } from '@/models/RefreshToken.model';
import { ApiError } from '@/utils/ApiError';
import { hashPassword, comparePassword, isStrongPassword } from '@/helpers/password';
import { issueOtp, verifyOtp } from '@/services/otp.service';
import {
  sendOtpEmail,
  sendWelcomeEmail,
  sendAdminNewUserNotification,
} from '@/services/email.service';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/helpers/jwt';
import { logger } from '@/utils/logger';

interface SignupPayload {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  passwordHash: string;
}

// ---------- SIGNUP ----------

export async function requestSignupOtp(input: {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
}): Promise<{ email: string; expiresAt: Date }> {
  const email = input.email.toLowerCase().trim();
  const { name, countryCode, phone, password, confirmPassword } = input;

  if (password !== confirmPassword) {
    throw ApiError.badRequest('Passwords do not match.');
  }
  if (!isStrongPassword(password)) {
    throw ApiError.badRequest(
      'Password must be at least 8 characters and include upper, lower, number, and special character.',
    );
  }

  // Uniqueness — check against verified accounts. If an unverified stale account
  // exists we let the OTP flow overwrite it on completion.
  const [emailTaken, phoneTaken] = await Promise.all([
    User.findOne({ email, isVerified: true }).lean(),
    User.findOne({ countryCode, phone, isVerified: true }).lean(),
  ]);
  if (emailTaken) throw ApiError.conflict('An account with this email already exists.');
  if (phoneTaken) throw ApiError.conflict('An account with this phone number already exists.');

  const passwordHash = await hashPassword(password);
  const payload: SignupPayload = { name: name.trim(), email, countryCode, phone, passwordHash };

  const { code, expiresAt } = await issueOtp({
    identifier: email,
    purpose: 'signup',
    payload,
  });

  // Fire email — we do NOT await Cloudinary/etc; failure surfaces as ApiError
  const result = await sendOtpEmail({ to: email, name: name.trim(), otp: code, purpose: 'signup' });
  if (!result.ok) {
    logger.error(`Signup OTP email failed for ${email}`, { error: result.error });
    throw ApiError.internal('Could not send verification email. Please try again shortly.');
  }

  return { email, expiresAt };
}

export async function verifySignupOtp(input: {
  email: string;
  code: string;
  userAgent?: string;
  ip?: string;
}): Promise<{
  user: unknown;
  accessToken: string;
  refreshToken: string;
  refreshJti: string;
  refreshExp: Date;
}> {
  const email = input.email.toLowerCase().trim();
  const { payload } = await verifyOtp({
    identifier: email,
    purpose: 'signup',
    code: input.code,
  });

  const p = payload as SignupPayload | null;
  if (!p || !p.passwordHash) throw ApiError.badRequest('Signup session expired. Please start over.');

  // Race: if someone verified an account in the meantime, upsert defensively.
  const existing = await User.findOne({ email });
  let user;
  if (existing) {
    existing.name = p.name;
    existing.countryCode = p.countryCode;
    existing.phone = p.phone;
    existing.passwordHash = p.passwordHash;
    existing.isVerified = true;
    existing.lastLoginAt = new Date();
    existing.lastLoginIp = input.ip;
    await existing.save();
    user = existing;
  } else {
    user = await User.create({
      name: p.name,
      email: p.email,
      countryCode: p.countryCode,
      phone: p.phone,
      passwordHash: p.passwordHash,
      isVerified: true,
      lastLoginAt: new Date(),
      lastLoginIp: input.ip,
    });
  }

  const tokens = await issueTokensForUser(user._id.toString(), user.email, {
    ip: input.ip,
    userAgent: input.userAgent,
  });

  // Fire-and-forget notifications
  void sendWelcomeEmail(email, p.name);
  void sendAdminNewUserNotification({
    name: p.name,
    email,
    phone: p.phone,
    countryCode: p.countryCode,
  });

  return { user: user.toJSON(), ...tokens };
}

// ---------- LOGIN ----------

export async function login(input: {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}): Promise<{
  user: unknown;
  accessToken: string;
  refreshToken: string;
  refreshJti: string;
  refreshExp: Date;
}> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid email or password.');
  if (user.isBlocked) throw ApiError.forbidden('Your account has been blocked. Contact support.');
  if (!user.isVerified) throw ApiError.unauthorized('Please verify your email to sign in.');

  const ok = await comparePassword(input.password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password.');

  user.lastLoginAt = new Date();
  user.lastLoginIp = input.ip;
  await user.save();

  const tokens = await issueTokensForUser(user._id.toString(), user.email, {
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { user: user.toJSON(), ...tokens };
}

// ---------- FORGOT PASSWORD ----------

export async function requestPasswordResetOtp(input: { email: string }): Promise<void> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email });

  // Do NOT reveal whether the email exists — respond OK either way to the controller.
  if (!user || !user.isVerified) return;

  const { code } = await issueOtp({
    identifier: email,
    purpose: 'password_reset',
    payload: { userId: user._id.toString() },
  });
  const result = await sendOtpEmail({
    to: email,
    name: user.name,
    otp: code,
    purpose: 'password_reset',
  });
  if (!result.ok) {
    logger.error(`Password reset OTP email failed for ${email}`, { error: result.error });
    throw ApiError.internal('Could not send reset email. Please try again shortly.');
  }
}

export async function resetPassword(input: {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  if (input.newPassword !== input.confirmPassword) {
    throw ApiError.badRequest('Passwords do not match.');
  }
  if (!isStrongPassword(input.newPassword)) {
    throw ApiError.badRequest(
      'Password must be at least 8 characters and include upper, lower, number, and special character.',
    );
  }

  const email = input.email.toLowerCase().trim();
  const { payload } = await verifyOtp({
    identifier: email,
    purpose: 'password_reset',
    code: input.code,
  });

  const userId = (payload as { userId?: string } | null)?.userId;
  const user = userId ? await User.findById(userId) : await User.findOne({ email });
  if (!user) throw ApiError.notFound('Account not found.');

  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();

  // Invalidate all existing refresh tokens for this user (Part 4 rule).
  await RefreshToken.updateMany(
    { audience: 'user', subjectId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

// ---------- TOKEN LIFECYCLE ----------

export async function issueTokensForUser(
  userId: string,
  email: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<{ accessToken: string; refreshToken: string; refreshJti: string; refreshExp: Date }> {
  const jti = randomUUID();
  const accessToken = signAccessToken({ sub: userId, aud: 'user', email, role: 'user' });
  const refreshToken = signRefreshToken({ sub: userId, aud: 'user', jti });
  // Refresh TTL from env default 7d — mirror it here for the DB record
  const refreshExp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    jti,
    audience: 'user',
    subjectId: userId,
    userAgent: meta.userAgent ?? '',
    ip: meta.ip ?? '',
    expiresAt: refreshExp,
  });

  return { accessToken, refreshToken, refreshJti: jti, refreshExp };
}

/**
 * Rotate a refresh token. Detects reuse of revoked tokens (compromise signal).
 */
export async function rotateUserRefreshToken(
  presented: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<{ accessToken: string; refreshToken: string; refreshJti: string; refreshExp: Date }> {
  let decoded;
  try {
    decoded = verifyRefreshToken(presented);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token.');
  }
  if (decoded.aud !== 'user') throw ApiError.unauthorized('Wrong token audience.');

  const record = await RefreshToken.findOne({ jti: decoded.jti });
  if (!record) throw ApiError.unauthorized('Session not found. Please log in again.');

  if (record.revokedAt) {
    // Reuse of a revoked token — invalidate all sessions for this subject.
    await RefreshToken.updateMany(
      { audience: 'user', subjectId: record.subjectId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    logger.warn(`Refresh token reuse detected for user ${String(record.subjectId)}`);
    throw ApiError.unauthorized('Session invalidated. Please log in again.');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  const user = await User.findById(record.subjectId);
  if (!user || user.isBlocked) throw ApiError.unauthorized('Account unavailable.');

  const newJti = randomUUID();
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    aud: 'user',
    email: user.email,
    role: 'user',
  });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), aud: 'user', jti: newJti });
  const refreshExp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    jti: newJti,
    audience: 'user',
    subjectId: user._id,
    userAgent: meta.userAgent ?? '',
    ip: meta.ip ?? '',
    expiresAt: refreshExp,
  });

  record.revokedAt = new Date();
  record.replacedBy = newJti;
  await record.save();

  return { accessToken, refreshToken, refreshJti: newJti, refreshExp };
}

export async function revokeUserRefreshToken(presented: string | undefined): Promise<void> {
  if (!presented) return;
  try {
    const decoded = verifyRefreshToken(presented);
    await RefreshToken.updateOne(
      { jti: decoded.jti, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  } catch {
    // Silently ignore — logout should be idempotent.
  }
}
