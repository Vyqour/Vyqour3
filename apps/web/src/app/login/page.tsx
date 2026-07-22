'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_URL } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      toast.success(`Welcome back, ${user.firstName}`);
      const next = searchParams.get('next');
      const safeNext =
        next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      if (safeNext) {
        router.push(safeNext);
      } else {
        router.push(user.role === 'CUSTOMER' ? '/account' : '/admin');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      toast.error(msg && msg !== 'Request failed' ? msg : 'Login failed — check email/password and that the API is running');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-px flex min-h-[70vh] items-center justify-center py-16">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Account</p>
        <h1 className="mt-2 text-2xl font-medium">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Wear Your Identity.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label-field">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label-field mb-0">Password</label>
              <Link href="/forgot-password" className="text-xs text-primary-glow hover:underline">
                Forgot?
              </Link>
            </div>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <a
          href={`${API_URL}/auth/google`}
          className="btn-secondary mt-3 flex w-full"
        >
          Continue with Google
        </a>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link href="/register" className="text-white hover:text-primary-glow">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container-px flex min-h-[70vh] items-center justify-center py-16">
          <div className="glass w-full max-w-md rounded-3xl p-8 text-sm text-muted-foreground">
            Loading…
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
