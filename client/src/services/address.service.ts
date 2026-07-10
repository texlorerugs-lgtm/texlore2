import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';
import type { Address, AddressInput } from '@/types/commerce';

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export const addressApi = {
  list: () => unwrap<{ addresses: Address[] }>(http.get('/addresses')),
  create: (body: AddressInput) =>
    unwrap<{ addresses: Address[] }>(http.post('/addresses', body)),
  update: (id: string, body: Partial<AddressInput>) =>
    unwrap<{ addresses: Address[] }>(http.patch(`/addresses/${id}`, body)),
  remove: (id: string) =>
    unwrap<{ addresses: Address[] }>(http.delete(`/addresses/${id}`)),
  setDefault: (id: string) =>
    unwrap<{ addresses: Address[] }>(http.post(`/addresses/${id}/default`)),
};
