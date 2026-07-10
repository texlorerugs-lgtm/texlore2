import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  message: string;
}

export const contactApi = {
  submit: (body: ContactInput) => unwrap<{ id: string }>(http.post('/contact', body)),
};
