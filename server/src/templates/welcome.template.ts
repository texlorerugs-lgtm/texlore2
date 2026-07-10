import { renderEmail, escapeHtml } from './base';
import { env } from '@/config/env';

export function renderWelcomeEmail(name: string): {
  subject: string;
  html: string;
  text: string;
} {
  const bodyHtml = `
    <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#0B1B3A;font-size:30px;margin:0 0 12px;">
      Welcome to Texlore, ${escapeHtml(name)}
    </h1>
    <p style="margin:0 0 20px;color:#4A4A55;line-height:1.7;">
      Your account is verified. You now have access to our full collection of handwoven
      carpets and rugs — from timeless Persian classics to contemporary luxury pieces.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${escapeHtml(env.CLIENT_URL)}"
         style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#EBD08A);
                color:#0B1B3A;font-weight:600;padding:14px 32px;border-radius:999px;
                text-decoration:none;letter-spacing:0.5px;">
        Explore the Collection
      </a>
    </div>
    <p style="color:#4A4A55;line-height:1.6;margin:0;">
      Warmly,<br/>The Texlore team
    </p>
  `;
  return {
    subject: 'Welcome to Texlore',
    html: renderEmail({
      title: 'Welcome to Texlore',
      preheader: 'Your account is ready.',
      bodyHtml,
    }),
    text: `Welcome to Texlore, ${name}.\nYour account is verified. Explore: ${env.CLIENT_URL}`,
  };
}
