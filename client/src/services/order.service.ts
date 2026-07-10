import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';
import type { Order } from '@/types/order';

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export interface OrdersPage {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const orderApi = {
  list: (params: { page?: number; limit?: number } = {}) =>
    unwrap<OrdersPage>(http.get('/orders', { params })),

  get: (orderNumber: string) =>
    unwrap<{ order: Order }>(http.get(`/orders/${orderNumber}`)),

  cancel: (orderNumber: string, reason: string) =>
    unwrap<{ order: Order }>(http.post(`/orders/${orderNumber}/cancel`, { reason })),

  /**
   * Download the invoice PDF. We fetch via axios so the Authorization
   * header is attached (a plain <a href> would only send cookies and get
   * a 401 from the JWT-protected endpoint). The blob is then handed to
   * the browser as a real .pdf download.
   */
  downloadInvoice: async (orderNumber: string): Promise<void> => {
    const res = await http.get(`/orders/${orderNumber}/invoice`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${orderNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Release the object URL a moment later; some browsers cancel the
    // download if we revoke it immediately.
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  },
};
