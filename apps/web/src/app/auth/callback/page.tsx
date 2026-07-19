'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setTokens } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Spinner } from '@/components/ui/spinner';

function Callback() {
  const sp = useSearchParams();
  const router = useRouter();
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    const access = sp.get('accessToken');
    const refresh = sp.get('refreshToken');
    if (access) setTokens(access, refresh);
    fetchMe().finally(() => router.replace('/account'));
  }, [sp, fetchMe, router]);

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
