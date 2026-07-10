# Texlore — Invoice download fix

## Problem

The "Download invoice" button was a plain <a href="/api/v1/orders/…/invoice">
which sends only cookies, not the JWT Bearer token. The backend endpoint
requires the header, so the browser opened the raw JSON 401 response
instead of a PDF.

## Fix

Introduced `orderApi.downloadInvoice()` which fetches the PDF via axios
(with the Authorization header attached) as a blob, then triggers a real
browser download with the correct filename ({orderNumber}.pdf).

Both the order-success page and the order-detail page now use this new
function, with a proper "Preparing…" loading state and toast feedback.

## Files to replace

| Zip file | Put in your project at |
|---|---|
| `order.service.ts`     | `client/src/services/order.service.ts`   |
| `OrderSuccessPage.tsx` | `client/src/pages/OrderSuccessPage.tsx`  |
| `OrderDetailPage.tsx`  | `client/src/pages/OrderDetailPage.tsx`   |

## Steps

1. Replace all three files
2. Ctrl+C in the client terminal, `npm run dev`
3. Log in, place a test order (or open an existing one)
4. Click "Download invoice" — PDF downloads to your Downloads folder
   with filename like `TXL-20260709-9A632723.pdf`

No server changes needed. The email attachment continues to work
unchanged (that's a separate code path already using the same PDF
generator).
