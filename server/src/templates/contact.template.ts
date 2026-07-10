import { renderEmail, escapeHtml } from './base';

export function renderContactAdminEmail(m: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  message: string;
  createdAt: Date;
}): { subject: string; html: string; text: string } {
  const rows: Array<[string, string]> = [
    ['Name', m.name],
    ['Email', m.email],
    ['Phone', `${m.countryCode ?? ''} ${m.phone ?? ''}`.trim() || '—'],
    ['Received', m.createdAt.toISOString()],
  ];
  const bodyHtml = `
    <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#0B1B3A;font-size:26px;margin:0 0 12px;">
      New contact message
    </h1>
    <p style="color:#4A4A55;margin:0 0 20px;line-height:1.6;">
      Message ID: <code>${escapeHtml(m.id)}</code>
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="border-collapse:collapse;border:1px solid #E7E1D3;border-radius:12px;overflow:hidden;margin-bottom:16px;">
      ${rows
        .map(
          ([k, v]) => `
        <tr>
          <td style="padding:12px 16px;background:#FBF7F0;color:#957622;font-size:12px;letter-spacing:1px;text-transform:uppercase;width:110px;">${escapeHtml(k)}</td>
          <td style="padding:12px 16px;color:#0B1B3A;">${escapeHtml(v)}</td>
        </tr>`,
        )
        .join('')}
    </table>
    <div style="padding:16px;background:#FBF7F0;border:1px solid #E7E1D3;border-radius:12px;
                color:#2F2F38;line-height:1.6;white-space:pre-wrap;">${escapeHtml(m.message)}</div>
  `;
  return {
    subject: `New contact message from ${m.name}`,
    html: renderEmail({ title: 'New contact message', preheader: m.name, bodyHtml }),
    text: `New contact message\nFrom: ${m.name} <${m.email}>\n\n${m.message}`,
  };
}
