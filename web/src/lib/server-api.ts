const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
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
      // Preserve paginated shape
      if ('meta' in json && json.data && typeof json.data === 'object' && !Array.isArray(json.data) === false) {
        return json as T;
      }
      if (json.meta) return json as T;
      return json.data as T;
    }
    return json as T;
  } catch {
    return null;
  }
}
