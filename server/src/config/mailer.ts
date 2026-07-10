/**
 * Resend client for transactional email.
 *
 * We use Resend's HTTPS API (port 443) instead of raw SMTP because many
 * hosts — including Render's free tier — block outbound SMTP ports
 * (25/465/587). An HTTPS API call is not subject to that restriction and
 * needs no port/DNS/IPv4-vs-IPv6 workarounds.
 */
import { Resend } from 'resend';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export const resend = new Resend(env.RESEND_API_KEY);

export const mailFrom = `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_EMAIL}>`;

/**
 * Resend has no separate "verify credentials" call like SMTP's mailer.verify().
 * We do a lightweight sanity check instead: list domains, which requires a
 * valid API key and confirms the key is well-formed and accepted by Resend.
 */
export async function verifyMailer(): Promise<void> {
  try {
    const { error } = await resend.domains.list();
    if (error) throw new Error(error.message);
    logger.info('\u2705 Resend connected');
  } catch (err) {
    logger.error('Resend verification failed. Check RESEND_API_KEY.', err);
    throw err;
  }
}
Done
server/src/services/email.service.ts — sirf top ka import line aur send() function badalna hai:


Show updated email.service.ts top section
Show updated email.service.ts top section
Sirf import { getMailer, mailFrom } → import { resend, mailFrom } line change karo, aur send() function ka poora body upar dikhaye gaye code se replace karo (jahan const mailer = await getMailer()... tha).

server/.env.example — SMTP section ki jagah:

env
# --- Resend (transactional email, required) ---
RESEND_API_KEY=re_your_api_key
EMAIL_FROM_NAME=Texlore
EMAIL_FROM_EMAIL=onboarding@resend.dev
3. Push karo
powershell
git add .
git commit -m "feat: replace SMTP with Resend HTTP API (Render free tier blocks SMTP ports)"
git push
4. Render par env vars update karo
Settings → Environment mein jao:

Delete karo: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME, SMTP_FROM_EMAIL
Add karo: RESEND_API_KEY (Resend dashboard se copy kiya hua), EMAIL_FROM_NAME=Texlore, EMAIL_FROM_EMAIL=onboarding@resend.dev
Deploy hone ke baad logs mein ✅ Resend connected dikhna chahiye. Screenshot bhej dena confirm karne ke liye.



