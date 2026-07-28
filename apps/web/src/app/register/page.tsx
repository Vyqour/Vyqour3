'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    setLoading(true);
    try {
      await register({
        ...form,
        email: form.email.trim().toLowerCase(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      toast.success('Welcome to VYQOUR');
      router.push('/account');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      toast.error(msg && msg !== 'Request failed' ? msg : 'Registration failed — check your details and that the API is running');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-px flex min-h-[70vh] items-center justify-center py-16">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Join</p>
        <h1 className="mt-2 text-2xl font-medium">Create account</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">First name</label>
              <Input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Last name</label>
              <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Email</label>
            <Input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="label-field">Phone</label>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="label-field">Password</label>
            <Input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Min 8 chars with upper, lower, and a number
            </p>
          </div>
          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              required
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-primary"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-white underline hover:text-primary-glow">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-white underline hover:text-primary-glow">
                Privacy Policy
              </Link>
            </span>
          </label>
          <Button type="submit" className="w-full" loading={loading} disabled={!agreedToTerms}>
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:text-primary-glow">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
