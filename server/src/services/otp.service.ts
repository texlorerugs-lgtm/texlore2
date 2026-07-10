/**
 * OTP issuance + verification with:
 *   - resend cooldown (60s default)
 *   - max resends (3 default) per active window
 *   - single-use, bcrypt-hashed storage
 *   - attempt tracking (5 wrong attempts invalidates the OTP)
 *
 * The plain OTP is returned only from issue() so it can be emailed;
 * it is NEVER logged, stored, or returned via API.
 */
import { Otp, type OtpPurpose } from '@/models/Otp.model';
import {
  compareOtp,
  generateOtp,
  hashOtp,
  isResendCooldownOver,
  otpExpiresAt,
} from '@/helpers/otp';
import { env } from '@/config/env';
import { ApiError } from '@/utils/ApiError';

const MAX_VERIFY_ATTEMPTS = 5;

export interface IssuedOtp {
  code: string; // plain — email only
  expiresAt: Date;
  resendCount: number;
}

/**
 * Issue a fresh OTP or resend within limits.
 * If an active OTP exists we resend the same one? No — always fresh.
 * We reset attempts, increment resendCount.
 */
export async function issueOtp(params: {
  identifier: string; // email (lowercased inside model)
  purpose: OtpPurpose;
  payload?: unknown;
}): Promise<IssuedOtp> {
  const { identifier, purpose, payload = null } = params;

  const existing = await Otp.findOne({ identifier: identifier.toLowerCase(), purpose });

  if (existing && !isResendCooldownOver(existing.lastSentAt)) {
    throw ApiError.tooMany(
      `Please wait ${env.OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another code.`,
    );
  }

  if (existing && existing.resendCount >= env.OTP_MAX_RESEND) {
    throw ApiError.tooMany(
      'You have reached the maximum number of resends. Try again later.',
    );
  }

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = otpExpiresAt();
  const resendCount = (existing?.resendCount ?? 0) + (existing ? 1 : 0);

  if (existing) {
    existing.codeHash = codeHash;
    existing.expiresAt = expiresAt;
    existing.attempts = 0;
    existing.resendCount = resendCount;
    existing.lastSentAt = new Date();
    existing.consumedAt = null;
    if (payload !== undefined) existing.payload = payload;
    await existing.save();
  } else {
    await Otp.create({
      identifier: identifier.toLowerCase(),
      purpose,
      codeHash,
      expiresAt,
      resendCount: 0,
      attempts: 0,
      lastSentAt: new Date(),
      payload,
    });
  }

  return { code, expiresAt, resendCount };
}

/**
 * Verify an OTP; on success returns the payload and consumes the record.
 * Wrong attempts increment; after MAX_VERIFY_ATTEMPTS the record is deleted.
 */
export async function verifyOtp(params: {
  identifier: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<{ payload: unknown }> {
  const { identifier, purpose, code } = params;
  const doc = await Otp.findOne({ identifier: identifier.toLowerCase(), purpose });
  if (!doc) throw ApiError.badRequest('No verification code found. Please request a new one.');
  if (doc.consumedAt) throw ApiError.badRequest('This code has already been used.');
  if (doc.expiresAt.getTime() <= Date.now()) {
    await doc.deleteOne();
    throw ApiError.badRequest('This code has expired. Please request a new one.');
  }

  const ok = await compareOtp(code, doc.codeHash);
  if (!ok) {
    doc.attempts += 1;
    if (doc.attempts >= MAX_VERIFY_ATTEMPTS) {
      await doc.deleteOne();
      throw ApiError.badRequest('Too many wrong attempts. Please request a new code.');
    }
    await doc.save();
    throw ApiError.badRequest('Incorrect code. Please try again.');
  }

  const payload = doc.payload;
  // consume: single-use guarantee. We delete rather than mark to prevent reuse.
  await doc.deleteOne();
  return { payload };
}
