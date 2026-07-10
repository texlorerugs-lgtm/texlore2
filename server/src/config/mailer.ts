/**
 * Nodemailer SMTP transport + verification.
 * All transactional email (OTP, order confirm, etc.) flows through this.
 *
 * Render (and some other PaaS hosts) do not route outbound IPv6 traffic.
 * Nodemailer resolves both A and AAAA records for the SMTP host and then
 * picks one at random to connect to — so roughly half the time it picks an
 * IPv6 address, which then fails with ENETUNREACH on Render. To avoid that,
 * we resolve the SMTP host to an IPv4 address ourselves at startup and
 * connect to that literal IP, while keeping `servername` set to the real
 * hostname so TLS/SNI and certificate validation still work correctly.
 */
import dns from 'node:dns/promises';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPPool from 'nodemailer/lib/smtp-pool';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

let cachedMailer: Transporter | null = null;
let initPromise: Promise<Transporter> | null = null;

async function buildTransporter(): Promise<Transporter> {
  let host = env.SMTP_HOST;

  try {
    const { address } = await dns.lookup(env.SMTP_HOST, { family: 4 });
    host = address;
  } catch (err) {
    logger.warn(
      `Could not resolve an IPv4 address for SMTP host ${env.SMTP_HOST}; falling back to hostname (may hit IPv6 on some hosts).`,
      err,
    );
  }

  const smtpOptions: SMTPPool.Options = {
    host,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true for 465, false for 587/25
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    tls: {
      servername: env.SMTP_HOST,
    },
  };

  return nodemailer.createTransport(smtpOptions);
}

/** Returns the shared transporter, creating (and IPv4-resolving) it on first call. */
export async function getMailer(): Promise<Transporter> {
  if (cachedMailer) return cachedMailer;
  if (!initPromise) {
    initPromise = buildTransporter().then((t) => {
      cachedMailer = t;
      return t;
    });
  }
  return initPromise;
}

export const mailFrom = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`;

export async function verifyMailer(): Promise<void> {
  try {
    const mailer = await getMailer();
    await mailer.verify();
    logger.info('\u2705 SMTP connected');
  } catch (err) {
    logger.error('SMTP verification failed. Check SMTP_* env vars.', err);
    throw err;
  }
}
