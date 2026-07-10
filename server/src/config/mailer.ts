/**
 * Nodemailer SMTP transport + verification.
 * All transactional email (OTP, order confirm, etc.) flows through this.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export const mailer: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE, // true for 465, false for 587/25
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
});

export const mailFrom = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`;

export async function verifyMailer(): Promise<void> {
  try {
    await mailer.verify();
    logger.info('\u2705 SMTP connected');
  } catch (err) {
    logger.error('SMTP verification failed. Check SMTP_* env vars.', err);
    throw err;
  }
}
