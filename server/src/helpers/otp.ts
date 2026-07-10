/**
 * OTP helpers — cryptographically strong 6-digit codes + bcrypt hashing.
 * The plain OTP is never stored, never logged, never returned to the client.
 */
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '@/config/env';

/** Generate a numeric OTP of configured length (default 6). */
export function generateOtp(length: number = env.OTP_LENGTH): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(randomInt(min, max));
}

/** Hash the OTP for storage. */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

/** Compare a candidate OTP against its hash. */
export function compareOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/** Expiry timestamp for a newly issued OTP. */
export function otpExpiresAt(): Date {
  return new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60_000);
}

/** Whether we may issue another OTP for the given last-sent time. */
export function isResendCooldownOver(lastSentAt: Date | null | undefined): boolean {
  if (!lastSentAt) return true;
  const elapsedSec = (Date.now() - lastSentAt.getTime()) / 1000;
  return elapsedSec >= env.OTP_RESEND_COOLDOWN_SECONDS;
}
