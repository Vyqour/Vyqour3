/**
 * Server-side fetch (RSC / route handlers).
 * Talks to Nest over the internal network (localhost in Codespaces).
 */
function resolveServerApiUrl(): string {
  const internal = (process.env.INTERNAL_API_URL || '').replace(/\/+$/, '');
  if (internal) {
    return internal.endsWith('/api/v1') ? internal : `${internal}/api/v1`;
  }
  return (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(
    /\/+$/,
    '',
  );
}

const API_URL = resolveServerApiUrl();

export async function serverFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...init,
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && typeof json === 'object' && 'data' in json) {
      if (json.meta) return json as T;
      return json.data as T;
    }
    return json as T;
  } catch {
    return null;
  }
}
