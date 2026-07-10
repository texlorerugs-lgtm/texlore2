/**
 * Central axios instance with:
 *   - baseURL from VITE_API_URL
 *   - credentials on (for refresh cookie)
 *   - access-token attach on every request
 *   - single-flight refresh on 401 for both user + admin audiences
 */
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

export type Audience = 'user' | 'admin';

interface Tokens {
  user?: string | null;
  admin?: string | null;
}

const tokens: Tokens = { user: null, admin: null };

export function setAccessToken(audience: Audience, token: string | null): void {
  tokens[audience] = token;
}
export function getAccessToken(audience: Audience): string | null {
  return tokens[audience] ?? null;
}

export const http: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Config extension — callers can specify which audience token to attach.
 * Defaults to 'user'. Admin API calls set `audience: 'admin'`.
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    audience?: Audience;
    _retried?: boolean;
  }
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const audience = (config as AxiosRequestConfig).audience ?? 'user';
  const token = getAccessToken(audience);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh promise per audience
const refreshPromises: Record<Audience, Promise<string | null> | null> = {
  user: null,
  admin: null,
};

async function refresh(audience: Audience): Promise<string | null> {
  const url = audience === 'admin' ? '/admin/auth/refresh' : '/auth/refresh';
  try {
    const { data } = await axios.post(
      baseURL + url,
      {},
      { withCredentials: true, timeout: 15_000 },
    );
    const token = data?.data?.accessToken ?? null;
    if (token) setAccessToken(audience, token);
    return token;
  } catch {
    setAccessToken(audience, null);
    return null;
  }
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig | undefined;
    const status = error.response?.status;
    if (!config || status !== 401 || config._retried) {
      return Promise.reject(error);
    }
    // Never try to refresh the refresh endpoint itself, or login endpoints
    if (typeof config.url === 'string' && /\/auth\/(refresh|login|logout)/.test(config.url)) {
      return Promise.reject(error);
    }
    const audience: Audience = config.audience ?? 'user';
    config._retried = true;

    if (!refreshPromises[audience]) {
      refreshPromises[audience] = refresh(audience).finally(() => {
        refreshPromises[audience] = null;
      });
    }
    const newToken = await refreshPromises[audience];
    if (!newToken) return Promise.reject(error);
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
    return http.request(config);
  },
);
