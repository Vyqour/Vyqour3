import { getSessionId } from './utils';

/**
 * Resolve API base URL.
 * - Browser: always same-origin `/api/v1` (Next.js rewrites → Nest).
 *   Avoids Codespaces cross-origin CORS / private tunnel failures.
 * - Server (RSC): use INTERNAL_API_URL or NEXT_PUBLIC_API_URL or localhost.
 */
function resolveApiUrl(): string {
  if (typeof window !== 'undefined') {
    // Prefer explicit public URL only when it is already same-origin
    const pub = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
    if (pub) {
      try {
        const u = new URL(pub, window.location.origin);
        if (u.origin === window.location.origin) {
          return `${u.pathname.replace(/\/+$/, '')}` || '/api/v1';
        }
      } catch {
        /* fall through */
      }
    }
    return '/api/v1';
  }

  const internal = (process.env.INTERNAL_API_URL || '').replace(/\/+$/, '');
  if (internal) {
    return internal.endsWith('/api/v1') ? internal : `${internal}/api/v1`;
  }

  return (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(
    /\/+$/,
    '',
  );
}

const API_URL = resolveApiUrl();

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

function networkErrorMessage(err: unknown): string {
  const base =
    'Cannot reach the API (Failed to fetch). Make sure NestJS is running on port 4000, then restart Next.js.';
  if (err instanceof TypeError) {
    return `${base} Details: ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return base;
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

  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: h,
      credentials: 'include',
    });
  } catch (err) {
    throw new ApiError(networkErrorMessage(err), 0, err);
  }

  if (res.status === 401 && auth !== false) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      h.set('Authorization', `Bearer ${newToken}`);
      try {
        res = await fetch(url, {
          ...rest,
          headers: h,
          credentials: 'include',
        });
      } catch (err) {
        throw new ApiError(networkErrorMessage(err), 0, err);
      }
    }
  }

  // Next rewrite target down → 502/504 from proxy
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new ApiError(
      `API is not reachable (HTTP ${res.status}). Start the NestJS server on port 4000 (apps/api), keep it running, then retry login.`,
      res.status,
    );
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const body = json as {
      message?: string | string[];
      error?: string;
      statusCode?: number;
    } | null;
    let msg: string | string[] | undefined = body?.message;
    if (Array.isArray(msg)) msg = msg.join(', ');
    if (!msg || msg === 'Request failed') {
      msg =
        body?.error ||
        (res.status === 0
          ? 'Cannot reach the API'
          : res.status === 401
            ? 'Invalid email or password'
            : res.status === 409
              ? 'Conflict — resource already exists'
              : res.status === 400
                ? 'Invalid request — check your input'
                : res.statusText) ||
        `Request failed (${res.status})`;
    }
    throw new ApiError(String(msg), res.status, json);
  }

  if (json && typeof json === 'object' && 'data' in (json as object) && 'success' in (json as object)) {
    const envelope = json as { data: T; meta?: unknown; success?: boolean };
    // Paginated list responses keep { data, meta }
    if (envelope.meta && envelope.data && typeof envelope.data === 'object') {
      return { ...(envelope as object), data: envelope.data } as T;
    }
    return envelope.data;
  }
  return json as T;
}

export const apiClient = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    api<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    api<T>(path, {
      ...opts,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    api<T>(path, { ...opts, method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    api<T>(path, { ...opts, method: 'DELETE' }),
};

export { API_URL, ApiError };
