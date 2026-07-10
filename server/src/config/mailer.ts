/**
 * Resend client for transactional email.
 *
 * We use Resend's HTTPS API (port 443) instead of raw SMTP because many
 * hosts, including Render's free tier, block outbound SMTP ports
 * (25/465/587). An HTTPS API call is not subject to that restriction and
 * needs no port/DNS/IPv4-vs-IPv6 workarounds.
 */
import { Resend } from 'resend';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export const resend = new Resend(env.RESEND_API_KEY);

export const mailFrom = env.EMAIL_FROM_NAME + ' <' + env.EMAIL_FROM_EMAIL + '>';

/**
 * Resend has no separate "verify credentials" call like SMTP's mailer.verify().
 * We do a lightweight sanity check instead: list domains, which requires a
 * valid API key and confirms the key is well-formed and accepted by Resend.
 */
export async function verifyMailer(): Promise<void> {
  try {
    const result = await resend.domains.list();
    if (result.error) {
      throw new Error(result.error.message);
    }
    logger.info('Resend connected');
  } catch (err) {
    logger.error('Resend verification failed. Check RESEND_API_KEY.', err);
    throw err;
  }
}