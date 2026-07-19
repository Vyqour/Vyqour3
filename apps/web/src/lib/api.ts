import { getSessionId } from './utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type RequestOptions = RequestInit & {
  auth?: boolean;
  session?: boolean;
  token?: string | null;
};

class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vyqour_access') || null;
}

export function setTokens(access?: string | null, refresh?: string | null) {
  if (typeof window === 'undefined') return;
  if (access) localStorage.setItem('vyqour_access', access);
  else localStorage.removeItem('vyqour_access');
  if (refresh) localStorage.setItem('vyqour_refresh', refresh);
  else if (refresh === null) localStorage.removeItem('vyqour_refresh');
}

export function clearTokens() {
  setTokens(null, null);
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refresh = localStorage.getItem('vyqour_refresh');
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const json = await res.json();
    const data = json.data || json;
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    clearTokens();
    return null;
  }
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = false, session = false, token, headers, ...rest } = options;
  const h = new Headers(headers || {});
  if (!h.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
    h.set('Content-Type', 'application/json');
  }

  const access = token ?? getAccessToken();
  if (access) h.set('Authorization', `Bearer ${access}`);
  if (session || !access) {
    const sid = getSessionId();
    if (sid) h.set('x-session-id', sid);
  }

  let res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: h,
    credentials: 'include',
  });

  if (res.status === 401 && auth !== false) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      h.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers: h,
        credentials: 'include',
      });
    }
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const msg =
      (json as { message?: string | string[] })?.message ||
      res.statusText ||
      'Request failed';
    throw new ApiError(Array.isArray(msg) ? msg.join(', ') : String(msg), res.status, json);
  }

  if (json && typeof json === 'object' && 'data' in (json as object) && 'success' in (json as object)) {
    const envelope = json as { data: T; meta?: unknown };
    if (envelope.meta && envelope.data && typeof envelope.data === 'object') {
      return { ...(envelope as object), data: envelope.data } as T;
    }
    return envelope.data;
  }
  return json as T;
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) => api<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    api<T>(path, {
      ...opts,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    api<T>(path, { ...opts, method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string, opts?: RequestOptions) => api<T>(path, { ...opts, method: 'DELETE' }),
};

export { API_URL, ApiError };
