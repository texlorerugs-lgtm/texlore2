/**
 * Base HTML wrapper used by every transactional email.
 * Inline styles only — email clients strip <style> and external CSS.
 */
export interface BaseTemplateOptions {
  title: string;
  preheader?: string;
  bodyHtml: string;
}

export function renderEmail({ title, preheader = '', bodyHtml }: BaseTemplateOptions): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#FBF7F0;font-family:'Manrope',Segoe UI,Arial,sans-serif;color:#2F2F38;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      ${escapeHtml(preheader)}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FBF7F0">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
            style="max-width:600px;background:#FFFFFF;border-radius:20px;overflow:hidden;
                   box-shadow:0 20px 60px -20px rgba(11,27,58,0.18);">
            <tr>
              <td style="background:linear-gradient(135deg,#0B1B3A 0%,#1D2E5B 100%);padding:32px 40px;text-align:center;">
                <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;color:#D4AF37;letter-spacing:2px;">
                  Texlore
                </div>
                <div style="color:#FBF7F0;opacity:0.7;font-size:11px;letter-spacing:3px;margin-top:6px;">
                  HANDWOVEN LUXURY
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#0B1B3A;color:#FBF7F0;padding:24px 40px;text-align:center;font-size:12px;">
                <div style="opacity:0.7;margin-bottom:6px;">
                  Need help? Email us at
                  <a href="mailto:texlorerug@gmail.com" style="color:#D4AF37;text-decoration:none;">texlorerug@gmail.com</a>
                </div>
                <div style="opacity:0.5;">© ${new Date().getFullYear()} Texlore. All rights reserved.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
