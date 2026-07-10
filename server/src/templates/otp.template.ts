import { renderEmail, escapeHtml } from './base';
import type { OtpPurpose } from '@/models/Otp.model';
import { env } from '@/config/env';

const HEADINGS: Record<OtpPurpose, string> = {
  signup: 'Verify your Texlore account',
  password_reset: 'Reset your Texlore password',
  admin_login: 'Admin login verification',
};

const INTROS: Record<OtpPurpose, string> = {
  signup: 'Welcome to Texlore. Please use the code below to verify your email and finish creating your account.',
  password_reset: 'Use the code below to reset your Texlore password. If you did not request this, please ignore this email.',
  admin_login: 'A login attempt to the Texlore admin console is in progress. Enter this code to continue.',
};

export function renderOtpEmail(params: {
  name: string;
  otp: string;
  purpose: OtpPurpose;
}): { subject: string; html: string; text: string } {
  const { name, otp, purpose } = params;
  const heading = HEADINGS[purpose];
  const intro = INTROS[purpose];

  const bodyHtml = `
    <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#0B1B3A;font-size:28px;margin:0 0 12px;">
      ${escapeHtml(heading)}
    </h1>
    <p style="margin:0 0 24px;color:#4A4A55;line-height:1.6;">
      Hi ${escapeHtml(name || 'there')}, ${escapeHtml(intro)}
    </p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;padding:20px 36px;border-radius:16px;
                  background:linear-gradient(135deg,#FBF7F0,#FFFFFF);
                  border:1px solid #E7E1D3;">
        <div style="font-family:'Manrope',sans-serif;font-size:12px;letter-spacing:3px;
                    color:#957622;text-transform:uppercase;margin-bottom:8px;">
          Your verification code
        </div>
        <div style="font-family:'Manrope',monospace;font-size:36px;font-weight:700;
                    letter-spacing:10px;color:#0B1B3A;">
          ${escapeHtml(otp)}
        </div>
      </div>
    </div>
    <p style="color:#4A4A55;line-height:1.6;margin:0 0 8px;">
      This code expires in <strong>${env.OTP_EXPIRY_MINUTES} minutes</strong> and can be used only once.
    </p>
    <p style="color:#4A4A55;line-height:1.6;margin:0;">
      If you did not request this code, no action is required.
    </p>
  `;

  return {
    subject: `${heading} — ${otp}`,
    html: renderEmail({ title: heading, preheader: `Your Texlore code is ${otp}`, bodyHtml }),
    text: `${heading}\n\n${intro}\n\nYour code: ${otp}\nExpires in ${env.OTP_EXPIRY_MINUTES} minutes.\n\nIf you didn't request this, ignore this email.`,
  };
}
