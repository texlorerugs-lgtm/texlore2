import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';
import type { UserProfile } from '@/types/auth';

interface SignupRequestInput {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export const authApi = {
  signupRequest: (body: SignupRequestInput) =>
    unwrap<{ email: string; expiresAt: string }>(http.post('/api/v1/auth/signup/request', body)),

  signupVerify: (body: { email: string; code: string }) =>
    unwrap<{ user: UserProfile; accessToken: string }>(http.post('/api/v1/auth/signup/verify', body)),

  signupResend: (email: string) =>
    unwrap<{ email: string; expiresAt: string }>(http.post('/api/v1/auth/signup/resend', { email })),

  login: (body: { email: string; password: string }) =>
    unwrap<{ user: UserProfile; accessToken: string }>(http.post('/api/v1/auth/login', body)),

  refresh: () => unwrap<{ accessToken: string }>(http.post('/api/v1/auth/refresh')),

  logout: () => http.post('/api/v1/auth/logout'),

  me: () => unwrap<{ user: UserProfile }>(http.get('/api/v1/auth/me')),

  forgotRequest: (email: string) =>
    unwrap<{ email: string }>(http.post('/api/v1/auth/forgot/request', { email })),

  forgotReset: (body: {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) => unwrap<null>(http.post('/api/v1/auth/forgot/reset', body)),
};