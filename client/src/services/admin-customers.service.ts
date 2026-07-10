import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';

async function unwrap<T>(p: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  return (await p).data.data;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  lastLoginAt?: string;
  orderCount: number;
  totalSpent: number;
}

export interface CustomersPage {
  items: AdminCustomer[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const adminCustomersApi = {
  list: (params: {
    q?: string;
    status?: 'all' | 'active' | 'blocked' | 'verified' | 'unverified';
    page?: number;
    limit?: number;
    sort?: string;
  } = {}) =>
    unwrap<CustomersPage>(http.get('/admin/customers', { audience: 'admin', params })),
  setBlocked: (id: string, blocked: boolean) =>
    unwrap<{ blocked: boolean }>(
      http.post(`/admin/customers/${id}/block`, { blocked }, { audience: 'admin' }),
    ),
};
