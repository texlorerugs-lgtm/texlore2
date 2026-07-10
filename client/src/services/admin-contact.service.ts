import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';

async function unwrap<T>(p: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  return (await p).data.data;
}

export type ContactStatus = 'new' | 'read' | 'replied' | 'resolved' | 'archived';

export interface ContactMsg {
  id: string;
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  message: string;
  status: ContactStatus;
  adminNote?: string;
  emailNotified: boolean;
  createdAt: string;
}

export interface ContactPage {
  items: ContactMsg[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const adminContactApi = {
  list: (params: { q?: string; status?: ContactStatus | 'all'; page?: number; limit?: number } = {}) =>
    unwrap<ContactPage>(http.get('/admin/contact', { audience: 'admin', params })),
  updateStatus: (id: string, status: ContactStatus, adminNote?: string) =>
    unwrap<{ message: ContactMsg }>(
      http.patch(`/admin/contact/${id}/status`, { status, adminNote }, { audience: 'admin' }),
    ),
  remove: (id: string) => http.delete(`/admin/contact/${id}`, { audience: 'admin' }),
};
