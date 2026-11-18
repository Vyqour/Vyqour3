import { NextRequest, NextResponse } from 'next/server';

function getBackendApiBase(): string {
  const internal = (process.env.INTERNAL_API_URL || '').replace(/\/+$/, '');
  if (internal) {
    return internal.endsWith('/api/v1') ? internal : `${internal}/api/v1`;
  }
  const pub = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/+$/, '');
  return pub.endsWith('/api/v1') ? pub : `${pub}/api/v1`;
}

type UserMeResponse = {
  id: string;
  email: string;
  role: string;
  status: string;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken?: string;
  user?: UserMeResponse;
};

/**
 * Server-side Next.js route handler for the Qikink Live Diagnostic endpoint.
 *
 * Security:
 * - Validates the admin session against the NestJS backend before forwarding.
 * - Enforces Role.ADMIN or Role.SUPER_ADMIN.
 * - Forwards requests using a valid Bearer token without exposing credentials,
 *   refresh tokens, or API keys to browser JavaScript or client-side logs.
 * - Strictly read-only: performs diagnostic status lookup without database mutations.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;
    if (!orderId || !orderId.trim()) {
      return NextResponse.json(
        { success: false, message: 'orderId parameter is required' },
        { status: 400 },
      );
    }

    const backendBase = getBackendApiBase();

    // Extract access and refresh tokens from cookies or Authorization header
    let accessToken =
      request.cookies.get('access_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      null;
    const refreshToken = request.cookies.get('refresh_token')?.value || null;

    let user: UserMeResponse | null = null;
    let newAccessToken: string | null = null;
    let newRefreshToken: string | null = null;

    // Validate access token with backend /auth/me
    if (accessToken) {
      try {
        const meRes = await fetch(`${backendBase}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });
        if (meRes.ok) {
          const json = await meRes.json();
          user = (json.data || json) as UserMeResponse;
        }
      } catch {
        user = null;
      }
    }

    // If access token is missing or expired, attempt refresh using refresh_token
    if (!user && refreshToken) {
      try {
        const refRes = await fetch(`${backendBase}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
        if (refRes.ok) {
          const refJson = await refRes.json();
          const refData = (refJson.data || refJson) as RefreshResponse;
          if (refData.accessToken) {
            accessToken = refData.accessToken;
            newAccessToken = refData.accessToken;
            newRefreshToken = refData.refreshToken || null;
            user = refData.user || null;

            // If user wasn't in refresh response, fetch /auth/me with new token
            if (!user) {
              const meRes2 = await fetch(`${backendBase}/auth/me`, {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'application/json',
                },
              });
              if (meRes2.ok) {
                const json2 = await meRes2.json();
                user = (json2.data || json2) as UserMeResponse;
              }
            }
          }
        }
      } catch {
        user = null;
      }
    }

    // Verify authenticated user has administrative privileges
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please log in as an administrator.' },
        { status: 401 },
      );
    }

    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Insufficient permissions for Qikink diagnostics.' },
        { status: 403 },
      );
    }

    // Forward the diagnostic lookup to the backend read-only endpoint
    const diagnosticUrl = `${backendBase}/qikink/orders/${encodeURIComponent(orderId)}/live-status`;
    const diagRes = await fetch(diagnosticUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const diagJson = await diagRes.json();
    const payload = diagJson.data || diagJson;

    const response = NextResponse.json(payload, { status: diagRes.status });

    // Rotate auth cookies if refreshed during this call
    if (newAccessToken) {
      response.cookies.set('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });
    }
    if (newRefreshToken) {
      response.cookies.set('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal diagnostic proxy error',
      },
      { status: 500 },
    );
  }
}
