/**
 * PDF invoice generation via pdfkit. Streams to a Buffer so it can be
 * attached to the confirmation email and served by GET /orders/:num/invoice.
 */
import PDFDocument from 'pdfkit';
import type { OrderDoc } from '@/models/Order.model';

function money(n: number, currency = 'INR'): string {
  if (currency === 'USD') return `$${Number(n ?? 0).toFixed(2)}`;
  return `Rs. ${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const BRAND = {
  midnight: '#0B1B3A',
  gold: '#B8952B',
  charcoal: '#2F2F38',
  muted: '#6B6B75',
  line: '#E7E1D3',
};

export function generateInvoicePdf(order: OrderDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fillColor(BRAND.midnight)
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('TEXLORE', 48, 48);
    doc
      .fillColor(BRAND.gold)
      .fontSize(9)
      .font('Helvetica')
      .text('HANDWOVEN LUXURY', 48, 78, { characterSpacing: 3 });

    doc
      .fillColor(BRAND.midnight)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 48, { align: 'right', width: 147 });
    doc
      .fillColor(BRAND.muted)
      .fontSize(9)
      .font('Helvetica')
      .text(order.invoiceNumber, 400, 78, { align: 'right', width: 147 });

    // Divider
    doc.moveTo(48, 108).lineTo(547, 108).strokeColor(BRAND.line).lineWidth(1).stroke();

    // Meta grid
    const metaTop = 124;
    const half = 250;
    labeled(doc, 'Order number', order.orderNumber, 48, metaTop);
    labeled(
      doc,
      'Order date',
      new Date(order.createdAt as Date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      48 + half,
      metaTop,
    );
    labeled(doc, 'Payment ID', order.gatewayPaymentId, 48, metaTop + 36);
    labeled(doc, 'Payment status', order.paymentStatus, 48 + half, metaTop + 36);

    // Bill to
    const billTop = metaTop + 84;
    doc
      .fillColor(BRAND.gold)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('BILL TO', 48, billTop, { characterSpacing: 2 });
    doc
      .fillColor(BRAND.midnight)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(order.address.fullName, 48, billTop + 14);
    doc
      .fillColor(BRAND.charcoal)
      .font('Helvetica')
      .fontSize(10)
      .text(
        `${order.address.line1}${order.address.line2 ? ', ' + order.address.line2 : ''}`,
        48,
        billTop + 30,
        { width: 250 },
      )
      .text(`${order.address.city}, ${order.address.state} ${order.address.zip}`, {
        width: 250,
      })
      .text(order.address.country, { width: 250 })
      .text(`${order.address.countryCode ?? ''} ${order.address.phone}`, { width: 250 });

    doc
      .fillColor(BRAND.gold)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('SOLD BY', 48 + half, billTop, { characterSpacing: 2 });
    doc
      .fillColor(BRAND.midnight)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Texlore', 48 + half, billTop + 14);
    doc
      .fillColor(BRAND.charcoal)
      .font('Helvetica')
      .fontSize(10)
      .text('texlorerugs@gmail.com', 48 + half, billTop + 30);

    // Items table
    const tableTop = billTop + 160;
    doc.moveTo(48, tableTop - 8).lineTo(547, tableTop - 8).strokeColor(BRAND.line).stroke();
    header(doc, tableTop);

    let y = tableTop + 22;
    for (const it of order.items) {
      if (y > 700) {
        doc.addPage();
        y = 60;
        header(doc, y);
        y += 22;
      }
      doc
        .fillColor(BRAND.midnight)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(it.productName, 48, y, { width: 260 });
      doc
        .fillColor(BRAND.muted)
        .font('Helvetica')
        .fontSize(9)
        .text(`Size ${it.size}`, 48, y + 14);
      doc
        .fillColor(BRAND.charcoal)
        .fontSize(10)
        .font('Helvetica')
        .text(String(it.quantity), 330, y, { width: 40, align: 'center' })
        .text(money(it.netUnitPrice, order.currency), 380, y, {
          width: 70,
          align: 'right',
        })
        .text(money(it.lineTotal, order.currency), 460, y, {
          width: 87,
          align: 'right',
        });
      y += 32;
      doc.moveTo(48, y - 6).lineTo(547, y - 6).strokeColor(BRAND.line).stroke();
    }

    // Totals
    const totalsX = 340;
    y += 10;
    totalLine(doc, 'Subtotal', money(order.subtotal, order.currency), totalsX, y);
    y += 18;
    if (order.discount > 0) {
      totalLine(
        doc,
        `Discount${order.coupon?.code ? ' (' + order.coupon.code + ')' : ''}`,
        '-' + money(order.discount, order.currency),
        totalsX,
        y,
      );
      y += 18;
    }
    totalLine(
      doc,
      'Shipping',
      order.shipping === 0 ? 'Free' : money(order.shipping, order.currency),
      totalsX,
      y,
    );
    y += 18;
    if (order.tax > 0) {
      totalLine(doc, 'Tax', money(order.tax, order.currency), totalsX, y);
      y += 18;
    }
    doc.moveTo(totalsX, y + 2).lineTo(547, y + 2).strokeColor(BRAND.line).stroke();
    y += 10;
    doc
      .fillColor(BRAND.midnight)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('Total', totalsX, y, { width: 100 })
      .text(money(order.grandTotal, order.currency), totalsX + 100, y, {
        width: 107,
        align: 'right',
      });

    // Footer
    doc
      .fillColor(BRAND.muted)
      .font('Helvetica')
      .fontSize(9)
      .text(
        'Thank you for shopping with Texlore. Questions? Email texlorerugs@gmail.com',
        48,
        780,
        { align: 'center', width: 499 },
      );

    doc.end();
  });
}

function header(doc: PDFKit.PDFDocument, y: number): void {
  doc
    .fillColor(BRAND.gold)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('ITEM', 48, y, { characterSpacing: 2 })
    .text('QTY', 330, y, { width: 40, align: 'center', characterSpacing: 2 })
    .text('UNIT', 380, y, { width: 70, align: 'right', characterSpacing: 2 })
    .text('TOTAL', 460, y, { width: 87, align: 'right', characterSpacing: 2 });
}

function labeled(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
): void {
  doc
    .fillColor(BRAND.gold)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(label.toUpperCase(), x, y, { characterSpacing: 2 });
  doc
    .fillColor(BRAND.midnight)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(value, x, y + 12);
}

function totalLine(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
): void {
  doc
    .fillColor(BRAND.charcoal)
    .font('Helvetica')
    .fontSize(10)
    .text(label, x, y, { width: 120 })
    .text(value, x + 100, y, { width: 107, align: 'right' });
}
