'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

function Verify() {
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('err');
      setMsg('Missing token');
      return;
    }
    apiClient
      .post<{ message: string }>('/auth/verify-email', { token })
      .then((r) => {
        setStatus('ok');
        setMsg(r.message || 'Verified');
      })
      .catch((e) => {
        setStatus('err');
        setMsg(e instanceof Error ? e.message : 'Failed');
      });
  }, [token]);

  return (
    <div className="glass w-full max-w-md rounded-3xl p-8 text-center">
      {status === 'loading' && <Spinner className="mx-auto" />}
      {status !== 'loading' && (
        <>
          <h1 className="text-2xl font-medium">{status === 'ok' ? 'Email verified' : 'Verification failed'}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{msg}</p>
          <Button asChild className="mt-6">
            <Link href="/login">Continue</Link>
          </Button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="container-px flex min-h-[60vh] items-center justify-center py-16">
      <Suspense fallback={<Spinner />}>
        <Verify />
      </Suspense>
    </div>
  );
}
