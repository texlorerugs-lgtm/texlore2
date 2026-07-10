import { renderEmail, escapeHtml } from './base';
import { env } from '@/config/env';

function money(n: number, currency = 'INR'): string {
  if (currency === 'USD') return `$${Number(n ?? 0).toFixed(2)}`;
  return `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

interface EmailOrder {
  orderNumber: string;
  invoiceNumber: string;
  userName: string;
  items: Array<{
    productName: string;
    size: string;
    quantity: number;
    netUnitPrice: number;
    lineTotal: number;
    primaryImage?: string;
  }>;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  grandTotal: number;
  currency: string;
  gatewayPaymentId: string;
  address: {
    fullName: string;
    phone: string;
    countryCode?: string;
    line1: string;
    line2?: string;
    landmark?: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
  expectedDelivery?: Date | null;
}

function itemsTable(o: EmailOrder): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border-collapse:collapse;border:1px solid #E7E1D3;border-radius:12px;overflow:hidden;">
      <tr style="background:#FBF7F0;">
        <td style="padding:10px 14px;font-size:11px;letter-spacing:1px;color:#957622;text-transform:uppercase;">Item</td>
        <td style="padding:10px 14px;font-size:11px;letter-spacing:1px;color:#957622;text-transform:uppercase;text-align:center;">Qty</td>
        <td style="padding:10px 14px;font-size:11px;letter-spacing:1px;color:#957622;text-transform:uppercase;text-align:right;">Total</td>
      </tr>
      ${o.items
        .map(
          (it) => `
        <tr>
          <td style="padding:12px 14px;border-top:1px solid #E7E1D3;color:#0B1B3A;">
            <div style="font-weight:600;">${escapeHtml(it.productName)}</div>
            <div style="font-size:12px;color:#4A4A55;">Size: ${escapeHtml(it.size)} · ${money(it.netUnitPrice, o.currency)} each</div>
          </td>
          <td style="padding:12px 14px;border-top:1px solid #E7E1D3;color:#0B1B3A;text-align:center;">${it.quantity}</td>
          <td style="padding:12px 14px;border-top:1px solid #E7E1D3;color:#0B1B3A;text-align:right;font-weight:600;">${money(it.lineTotal, o.currency)}</td>
        </tr>`,
        )
        .join('')}
    </table>
  `;
}

function totalsBlock(o: EmailOrder): string {
  const rows: Array<[string, string, string?]> = [
    ['Subtotal', money(o.subtotal, o.currency)],
    ...(o.discount > 0 ? [['Discount', '−' + money(o.discount, o.currency), 'green'] as [string, string, string]] : []),
    ['Shipping', o.shipping === 0 ? 'Free' : money(o.shipping, o.currency)],
    ...(o.tax > 0 ? [['Tax', money(o.tax, o.currency)] as [string, string]] : []),
  ];
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      ${rows
        .map(
          ([k, v, color]) => `
        <tr>
          <td style="padding:4px 0;color:#4A4A55;font-size:14px;">${escapeHtml(k)}</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;color:${color === 'green' ? '#0F5132' : '#0B1B3A'};">${escapeHtml(v)}</td>
        </tr>`,
        )
        .join('')}
      <tr>
        <td style="padding:10px 0 0;border-top:1px solid #E7E1D3;font-weight:700;color:#0B1B3A;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;">Total</td>
        <td style="padding:10px 0 0;border-top:1px solid #E7E1D3;text-align:right;font-weight:700;color:#0B1B3A;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;">${escapeHtml(money(o.grandTotal, o.currency))}</td>
      </tr>
    </table>
  `;
}

function addressBlock(o: EmailOrder): string {
  const a = o.address;
  return `
    <div style="margin-top:24px;padding:16px;background:#FBF7F0;border:1px solid #E7E1D3;border-radius:12px;color:#2F2F38;">
      <div style="font-size:11px;letter-spacing:1px;color:#957622;text-transform:uppercase;margin-bottom:6px;">Shipping to</div>
      <div style="font-weight:600;color:#0B1B3A;">${escapeHtml(a.fullName)}</div>
      <div style="font-size:14px;">${escapeHtml(a.line1)}${a.line2 ? ', ' + escapeHtml(a.line2) : ''}${a.landmark ? ' (' + escapeHtml(a.landmark) + ')' : ''}</div>
      <div style="font-size:14px;">${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.zip)}</div>
      <div style="font-size:14px;">${escapeHtml(a.country)}</div>
      <div style="font-size:14px;margin-top:6px;">${escapeHtml(a.countryCode ?? '')} ${escapeHtml(a.phone)}</div>
    </div>
  `;
}

export function renderOrderConfirmationEmail(o: EmailOrder): {
  subject: string;
  html: string;
  text: string;
} {
  const eta = o.expectedDelivery
    ? new Date(o.expectedDelivery).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'within 5–8 business days';

  const bodyHtml = `
    <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#0B1B3A;font-size:30px;margin:0 0 8px;">
      Thank you, ${escapeHtml(o.userName.split(' ')[0] ?? o.userName)}
    </h1>
    <p style="color:#4A4A55;line-height:1.6;margin:0 0 20px;">
      Your Texlore order has been placed and paid for. We\u2019ll email tracking as soon as it ships.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:12px 14px;background:#FBF7F0;border:1px solid #E7E1D3;border-radius:12px 0 0 12px;">
          <div style="font-size:11px;letter-spacing:1px;color:#957622;text-transform:uppercase;">Order</div>
          <div style="font-weight:600;color:#0B1B3A;font-family:'Manrope',monospace;">${escapeHtml(o.orderNumber)}</div>
        </td>
        <td style="padding:12px 14px;background:#FBF7F0;border:1px solid #E7E1D3;border-left:0;border-radius:0 12px 12px 0;">
          <div style="font-size:11px;letter-spacing:1px;color:#957622;text-transform:uppercase;">Estimated delivery</div>
          <div style="font-weight:600;color:#0B1B3A;">${escapeHtml(eta)}</div>
        </td>
      </tr>
    </table>
    ${itemsTable(o)}
    ${totalsBlock(o)}
    ${addressBlock(o)}
    <div style="margin-top:24px;padding:12px 16px;background:#0B1B3A;color:#FBF7F0;border-radius:12px;font-size:13px;">
      Invoice: <code style="color:#D4AF37;">${escapeHtml(o.invoiceNumber)}</code> · Payment ID:
      <code style="color:#D4AF37;">${escapeHtml(o.gatewayPaymentId)}</code>
    </div>
    <div style="text-align:center;margin:28px 0 4px;">
      <a href="${escapeHtml(env.CLIENT_URL)}/orders/${escapeHtml(o.orderNumber)}"
         style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#EBD08A);
                color:#0B1B3A;font-weight:600;padding:12px 28px;border-radius:999px;
                text-decoration:none;letter-spacing:0.5px;">
        Track this order
      </a>
    </div>
  `;

  return {
    subject: `Your Texlore order ${o.orderNumber} is confirmed`,
    html: renderEmail({
      title: 'Order confirmed',
      preheader: `Order ${o.orderNumber} · ${money(o.grandTotal, o.currency)}`,
      bodyHtml,
    }),
    text: `Order ${o.orderNumber} confirmed.\nInvoice: ${o.invoiceNumber}\nTotal: ${money(o.grandTotal, o.currency)}\nTrack: ${env.CLIENT_URL}/orders/${o.orderNumber}`,
  };
}

export function renderAdminOrderEmail(o: EmailOrder): {
  subject: string;
  html: string;
  text: string;
} {
  const bodyHtml = `
    <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#0B1B3A;font-size:26px;margin:0 0 12px;">
      New paid order · ${escapeHtml(o.orderNumber)}
    </h1>
    <p style="color:#4A4A55;line-height:1.6;margin:0 0 16px;">
      Customer: <strong>${escapeHtml(o.userName)}</strong><br/>
      Payment ID: <code>${escapeHtml(o.gatewayPaymentId)}</code>
    </p>
    ${itemsTable(o)}
    ${totalsBlock(o)}
    ${addressBlock(o)}
  `;
  return {
    subject: `[Texlore] New paid order ${o.orderNumber} · ${money(o.grandTotal, o.currency)}`,
    html: renderEmail({ title: 'New paid order', preheader: o.orderNumber, bodyHtml }),
    text: `New paid order ${o.orderNumber}\nCustomer: ${o.userName}\nTotal: ${money(o.grandTotal, o.currency)}`,
  };
}

interface StatusEmailInput {
  orderNumber: string;
  userName: string;
  status: string;
  note?: string;
  trackingNumber?: string;
  courier?: string;
}

export function renderOrderStatusEmail(o: StatusEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const HEADLINES: Record<string, string> = {
    confirmed: 'Your order is confirmed',
    preparing: 'We\u2019re preparing your order',
    packed: 'Your order is packed',
    shipped: 'Your order has shipped',
    out_for_delivery: 'Out for delivery today',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled',
    returned: 'Your return has been received',
    refunded: 'Your refund is on its way',
  };
  const title = HEADLINES[o.status] ?? 'Order update';
  const bodyHtml = `
    <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#0B1B3A;font-size:28px;margin:0 0 8px;">
      ${escapeHtml(title)}
    </h1>
    <p style="color:#4A4A55;line-height:1.6;margin:0 0 16px;">
      Hi ${escapeHtml(o.userName.split(' ')[0] ?? o.userName)}, your order
      <code style="color:#0B1B3A;">${escapeHtml(o.orderNumber)}</code> is now
      <strong>${escapeHtml(o.status.replace(/_/g, ' '))}</strong>.
    </p>
    ${o.trackingNumber
      ? `<div style="padding:12px 16px;background:#FBF7F0;border:1px solid #E7E1D3;border-radius:12px;color:#0B1B3A;">
          <div style="font-size:11px;letter-spacing:1px;color:#957622;text-transform:uppercase;margin-bottom:4px;">Tracking</div>
          <div style="font-weight:600;">${escapeHtml(o.courier ?? '')} · ${escapeHtml(o.trackingNumber)}</div>
        </div>`
      : ''}
    ${o.note ? `<p style="color:#4A4A55;line-height:1.6;margin-top:16px;">${escapeHtml(o.note)}</p>` : ''}
    <div style="text-align:center;margin:24px 0 4px;">
      <a href="${escapeHtml(env.CLIENT_URL)}/orders/${escapeHtml(o.orderNumber)}"
         style="display:inline-block;background:#0B1B3A;color:#FBF7F0;
                padding:12px 28px;border-radius:999px;text-decoration:none;">
        View order
      </a>
    </div>
  `;
  return {
    subject: `${title} · ${o.orderNumber}`,
    html: renderEmail({ title, preheader: title, bodyHtml }),
    text: `${title}\nOrder: ${o.orderNumber}\nStatus: ${o.status}\n${o.trackingNumber ? 'Tracking: ' + o.trackingNumber : ''}`,
  };
}
