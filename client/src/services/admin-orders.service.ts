import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';
import type { Order, OrderStatus } from '@/types/order';

async function unwrap<T>(p: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  return (await p).data.data;
}

export interface AdminOrdersPage {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const adminOrdersApi = {
  list: (params: {
    q?: string;
    status?: OrderStatus | 'all';
    userId?: string;
    page?: number;
    limit?: number;
    sort?: string;
  } = {}) =>
    unwrap<AdminOrdersPage>(http.get('/admin/orders', { audience: 'admin', params })),

  get: (id: string) =>
    unwrap<{ order: Order }>(http.get(`/admin/orders/${id}`, { audience: 'admin' })),

  updateStatus: (
    id: string,
    body: { status: OrderStatus; note?: string; trackingNumber?: string; courier?: string },
  ) =>
    unwrap<{ order: Order }>(
      http.patch(`/admin/orders/${id}/status`, body, { audience: 'admin' }),
    ),

  invoiceUrl: (id: string): string => {
    const base = import.meta.env.VITE_API_URL ?? '/api/v1';
    return `${base}/admin/orders/${id}/invoice`;
  },
};
