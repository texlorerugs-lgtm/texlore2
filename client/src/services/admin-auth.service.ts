/**
 * Admin auth API — always audience:'admin' so the interceptor attaches
 * the admin access token.
 */
import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';
import type { AdminProfile } from '@/types/auth';

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export const adminAuthApi = {
  prepare: (body: { name: string; email: string; password: string; secretKey: string }) =>
    unwrap<{ email: string; expiresAt: string }>(
      http.post('/admin/auth/login/prepare', body, { audience: 'admin' }),
    ),

  verify: (body: { email: string; code: string }) =>
    unwrap<{ admin: AdminProfile; accessToken: string }>(
      http.post('/admin/auth/login/verify', body, { audience: 'admin' }),
    ),

  refresh: () =>
    unwrap<{ accessToken: string }>(http.post('/admin/auth/refresh', {}, { audience: 'admin' })),

  logout: () => http.post('/admin/auth/logout', {}, { audience: 'admin' }),

  me: () => unwrap<{ admin: AdminProfile }>(http.get('/admin/auth/me', { audience: 'admin' })),
};
