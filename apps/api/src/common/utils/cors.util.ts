/**
 * CORS helpers for localhost + GitHub Codespaces / similar preview hosts.
 * Supports credentials (reflects exact Origin, never '*').
 */

const LOCALHOST_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;

/** GitHub Codespaces forwarded ports, e.g. https://name-3000.app.github.dev */
const CODESPACES_ORIGIN =
  /^https:\/\/([a-z0-9-]+)-\d+\.app\.github\.dev$/i;

/** githubpreview / github.dev variants */
const GITHUB_PREVIEW_ORIGIN =
  /^https:\/\/([a-z0-9-]+)-\d+\.(?:preview\.)?app\.github\.dev$/i;

function trimOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function parseCorsOrigins(raw?: string | string[] | null): string[] {
  if (Array.isArray(raw)) {
    return raw.map(trimOrigin).filter(Boolean);
  }
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map(trimOrigin)
    .filter(Boolean);
}

export function isDynamicDevOrigin(origin: string): boolean {
  if (!origin) return false;
  if (LOCALHOST_ORIGIN.test(origin)) return true;
  if (CODESPACES_ORIGIN.test(origin)) return true;
  if (GITHUB_PREVIEW_ORIGIN.test(origin)) return true;
  return false;
}

/**
 * Returns true when the request Origin is allowed.
 * - Explicit list from CORS_ORIGINS / WEB_URL
 * - localhost / 127.0.0.1 any port
 * - *.app.github.dev Codespaces URLs
 * - CORS_ORIGINS=* (dev only) allows any non-empty origin (still reflected)
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowedList: string[],
  opts?: { allowAnyInDev?: boolean; nodeEnv?: string },
): boolean {
  if (!origin) return true; // non-browser / same-origin / curl

  const normalized = trimOrigin(origin);
  const list = allowedList.map(trimOrigin).filter(Boolean);

  if (list.includes('*')) {
    const env = opts?.nodeEnv || process.env.NODE_ENV || 'development';
    if (env !== 'production' || opts?.allowAnyInDev) return true;
  }

  if (list.some((o) => o.toLowerCase() === normalized.toLowerCase())) {
    return true;
  }

  // WEB_URL / APP_URL may be in list without trailing path
  if (isDynamicDevOrigin(normalized)) {
    return true;
  }

  return false;
}

export type CorsOriginCallback = (
  err: Error | null,
  origin?: boolean | string,
) => void;

/**
 * Nest/Express enableCors `origin` callback.
 * Reflects the request origin when allowed so credentials work.
 */
export function createCorsOriginDelegate(allowedList: string[]) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  return (origin: string | undefined, callback: CorsOriginCallback) => {
    try {
      if (isOriginAllowed(origin, allowedList, { nodeEnv })) {
        // Reflect origin (or true for no-origin requests)
        if (!origin) return callback(null, true);
        return callback(null, origin);
      }
      return callback(null, false);
    } catch (err) {
      return callback(err as Error, false);
    }
  };
}

export const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'Origin',
  'X-Requested-With',
  'x-session-id',
  'X-Session-Id',
  'x-razorpay-signature',
  'x-qikink-signature',
  'x-signature',
  'Cookie',
];

export const CORS_METHODS = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
];
