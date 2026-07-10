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
 * Resend has no lightweight "verify credentials" endpoint that works with a
 * restricted, send-only API key (the recommended key type). We simply
 * confirm an API key was provided; the real test is the first actual send,
 * whose result is always logged by email.service.ts.
 */
export async function verifyMailer(): Promise<void> {
  if (!env.RESEND_API_KEY) {
    logger.error('RESEND_API_KEY is not set.');
    throw new Error('RESEND_API_KEY is not set');
  }
  logger.info('Resend client ready');
}
