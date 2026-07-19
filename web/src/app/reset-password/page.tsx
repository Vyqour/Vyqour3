'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

function ResetForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get('token') || '';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      toast.success('Password updated');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass w-full max-w-md rounded-3xl p-8">
      <h1 className="text-2xl font-medium">Choose a new password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label-field">New password</label>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" loading={loading} disabled={!token}>
          Update password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container-px flex min-h-[60vh] items-center justify-center py-16">
      <Suspense fallback={<Spinner />}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
