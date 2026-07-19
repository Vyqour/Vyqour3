'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Check your inbox');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-px flex min-h-[60vh] items-center justify-center py-16">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <h1 className="text-2xl font-medium">Reset password</h1>
        {sent ? (
          <p className="mt-4 text-sm text-muted-foreground">
            If an account exists for {email}, a reset link has been sent.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label-field">Email</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Send reset link
            </Button>
          </form>
        )}
        <Link href="/login" className="mt-6 block text-center text-sm text-primary-glow">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
