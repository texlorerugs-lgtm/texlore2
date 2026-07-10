/**
 * Email service. Wraps Resend's HTTP API with logging + structured results.
 * Every call returns a structured result so callers can decide whether to
 * surface errors (e.g. contact form must persist the message even if email
 * fails — see contact.service.ts in M4).
 */
import { resend, mailFrom } from '@/config/mailer';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { renderOtpEmail } from '@/templates/otp.template';
import { renderWelcomeEmail } from '@/templates/welcome.template';
import { renderAdminNewUserEmail } from '@/templates/admin-notification.template';
import { renderContactAdminEmail } from '@/templates/contact.template';
import {
  renderOrderConfirmationEmail,
  renderAdminOrderEmail,
  renderOrderStatusEmail,
} from '@/templates/order.template';
import type { OtpPurpose } from '@/models/Otp.model';

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

interface Attachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

async function send(
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments?: Attachment[],
): Promise<SendResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: mailFrom,
      to,
      subject,
      html,
      text,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    if (error) {
      throw new Error(error.message);
    }

    logger.info(`Email sent to ${to} (${subject})`, { messageId: data?.id });
    return { ok: true, messageId: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Email send failed to ${to} (${subject})`, { error: msg });
    return { ok: false, error: msg };
  }
}

export function sendOtpEmail(params: {
  to: string;
  name: string;
  otp: string;
  purpose: OtpPurpose;
}): Promise<SendResult> {
  const { to, name, otp, purpose } = params;
  const { subject, html, text } = renderOtpEmail({ name, otp, purpose });
  return send(to, subject, html, text);
}

export function sendWelcomeEmail(to: string, name: string): Promise<SendResult> {
  const { subject, html, text } = renderWelcomeEmail(name);
  return send(to, subject, html, text);
}

export function sendAdminNewUserNotification(user: {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}): Promise<SendResult> {
  const { subject, html, text } = renderAdminNewUserEmail(user);
  return send(env.ADMIN_EMAIL, subject, html, text);
}

export function sendAdminContactNotification(m: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  message: string;
  createdAt: Date;
}): Promise<SendResult> {
  const { subject, html, text } = renderContactAdminEmail(m);
  return send(env.ADMIN_EMAIL, subject, html, text);
}

type OrderEmailInput = Parameters<typeof renderOrderConfirmationEmail>[0];

export function sendOrderConfirmationEmail(
  to: string,
  order: OrderEmailInput,
  attachment?: { filename: string; content: Buffer; contentType: string },
): Promise<SendResult> {
  const { subject, html, text } = renderOrderConfirmationEmail(order);
  return send(to, subject, html, text, attachment ? [attachment] : undefined);
}

export function sendAdminOrderNotification(
  order: OrderEmailInput,
): Promise<SendResult> {
  const { subject, html, text } = renderAdminOrderEmail(order);
  return send(env.ADMIN_EMAIL, subject, html, text);
}

export function sendOrderStatusEmail(
  to: string,
  input: Parameters<typeof renderOrderStatusEmail>[0],
): Promise<SendResult> {
  const { subject, html, text } = renderOrderStatusEmail(input);
  return send(to, subject, html, text);
}