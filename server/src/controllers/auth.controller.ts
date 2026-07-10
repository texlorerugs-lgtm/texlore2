/**
 * User auth controllers. Thin — parse req, call service, respond.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok, created } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  requestSignupOtp,
  verifySignupOtp,
  login as loginSvc,
  requestPasswordResetOtp,
  resetPassword,
  rotateUserRefreshToken,
  revokeUserRefreshToken,
} from '@/services/auth.service';
import { issueOtp } from '@/services/otp.service';
import { sendOtpEmail } from '@/services/email.service';
import {
  REFRESH_COOKIE_USER,
  clearRefreshCookie,
  setRefreshCookie,
} from '@/helpers/cookies';
import { User } from '@/models/User.model';
import { Otp } from '@/models/Otp.model';

function reqMeta(req: Request): { ip: string; userAgent: string } {
  return {
    ip: (req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.ip ?? '').trim(),
    userAgent: req.headers['user-agent'] ?? '',
  };
}

export const signupRequest = asyncHandler(async (req: Request, res: Response) => {
  const { email, expiresAt } = await requestSignupOtp(req.body);
  ok(res, { email, expiresAt }, 'Verification code sent to your email.');
});

export const signupVerify = asyncHandler(async (req: Request, res: Response) => {
  const meta = reqMeta(req);
  const { user, accessToken, refreshToken, refreshExp } = await verifySignupOtp({
    email: req.body.email,
    code: req.body.code,
    ...meta,
  });
  setRefreshCookie(
    res,
    REFRESH_COOKIE_USER,
    refreshToken,
    Math.max(0, refreshExp.getTime() - Date.now()),
  );
  created(res, { user, accessToken }, 'Account created successfully.');
});

/**
 * Resend an OTP for signup or password reset.
 * We look at the existing OTP record's purpose. If none exists we require the
 * client to hit the request endpoint first (prevents blind resend abuse).
 */
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const email = String(req.body.email).toLowerCase().trim();

  // Only signup resend is exposed here — password_reset uses a dedicated path.
  const user = await User.findOne({ email }).lean();
  // For unknown emails we behave neutrally to avoid enumeration.
  if (user && user.isVerified) {
    ok(res, { email }, 'If a signup is in progress, a new code has been sent.');
    return;
  }
  // Attempt to resend the signup OTP — service enforces cooldown + max resends.
  // If there's no active signup OTP the issueOtp call will still create one but
  // without payload; without payload verifySignupOtp will reject. To keep flows
  // clean we require an active signup:
  const existing = await Otp.findOne({ identifier: email, purpose: 'signup' });
  if (!existing) throw ApiError.badRequest('Please start signup again.');

  const { code, expiresAt } = await issueOtp({
    identifier: email,
    purpose: 'signup',
    payload: existing.payload,
  });
  const name = (existing.payload as { name?: string } | null)?.name ?? 'there';
  const result = await sendOtpEmail({ to: email, name, otp: code, purpose: 'signup' });
  if (!result.ok) throw ApiError.internal('Could not resend code. Try again shortly.');
  ok(res, { email, expiresAt }, 'A new verification code has been sent.');
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const meta = reqMeta(req);
  const { user, accessToken, refreshToken, refreshExp } = await loginSvc({
    email: req.body.email,
    password: req.body.password,
    ...meta,
  });
  setRefreshCookie(
    res,
    REFRESH_COOKIE_USER,
    refreshToken,
    Math.max(0, refreshExp.getTime() - Date.now()),
  );
  ok(res, { user, accessToken }, 'Signed in successfully.');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.signedCookies?.[REFRESH_COOKIE_USER];
  if (!presented) throw ApiError.unauthorized('No refresh token.');
  const meta = reqMeta(req);
  const { accessToken, refreshToken, refreshExp } = await rotateUserRefreshToken(
    presented,
    meta,
  );
  setRefreshCookie(
    res,
    REFRESH_COOKIE_USER,
    refreshToken,
    Math.max(0, refreshExp.getTime() - Date.now()),
  );
  ok(res, { accessToken }, 'Session refreshed.');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.signedCookies?.[REFRESH_COOKIE_USER];
  await revokeUserRefreshToken(presented);
  clearRefreshCookie(res, REFRESH_COOKIE_USER);
  ok(res, null, 'Signed out.');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('Account not found.');
  ok(res, { user: user.toJSON() }, 'OK');
});

export const forgotRequest = asyncHandler(async (req: Request, res: Response) => {
  await requestPasswordResetOtp({ email: req.body.email });
  // Always respond OK to avoid enumeration.
  ok(res, { email: req.body.email }, 'If that email exists, a reset code has been sent.');
});

export const forgotReset = asyncHandler(async (req: Request, res: Response) => {
  await resetPassword(req.body);
  ok(res, null, 'Password updated. Please log in with your new password.');
});
