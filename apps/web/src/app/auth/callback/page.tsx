'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setTokens } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Spinner } from '@/components/ui/spinner';

function Callback() {
  const router = useRouter();
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const access = params.get('accessToken');
    const refresh = params.get('refreshToken');

    // Remove credentials from the visible URL/history immediately after reading.
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.search,
    );

    if (access) setTokens(access, refresh);
    fetchMe().then((user) => {
      router.replace(user ? '/account' : '/login?error=google_auth_failed');
    });
  }, [fetchMe, router]);

  return (
    <div className="flex flex-col items-center gap-3 py-24">
      <Spinner />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Callback />
    </Suspense>
  );
}
