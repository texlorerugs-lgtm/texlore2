import { renderEmail, escapeHtml } from './base';

export function renderAdminNewUserEmail(user: {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}): { subject: string; html: string; text: string } {
  const bodyHtml = `
    <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#0B1B3A;font-size:26px;margin:0 0 12px;">
      New customer signup
    </h1>
    <p style="color:#4A4A55;line-height:1.6;margin:0 0 20px;">
      A new customer has just verified their Texlore account.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="border-collapse:collapse;border:1px solid #E7E1D3;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#FBF7F0;color:#957622;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Name</td>
          <td style="padding:12px 16px;color:#0B1B3A;">${escapeHtml(user.name)}</td></tr>
      <tr><td style="padding:12px 16px;background:#FBF7F0;color:#957622;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Email</td>
          <td style="padding:12px 16px;color:#0B1B3A;">${escapeHtml(user.email)}</td></tr>
      <tr><td style="padding:12px 16px;background:#FBF7F0;color:#957622;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Phone</td>
          <td style="padding:12px 16px;color:#0B1B3A;">${escapeHtml(user.countryCode)} ${escapeHtml(user.phone)}</td></tr>
    </table>
  `;
  return {
    subject: `New Texlore signup — ${user.email}`,
    html: renderEmail({
      title: 'New signup',
      preheader: `New signup: ${user.email}`,
      bodyHtml,
    }),
    text: `New signup\nName: ${user.name}\nEmail: ${user.email}\nPhone: ${user.countryCode} ${user.phone}`,
  };
}
