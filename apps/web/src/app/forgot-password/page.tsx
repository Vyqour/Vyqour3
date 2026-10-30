'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((remaining) => Math.max(0, remaining - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const requestReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error('Enter your email address');
      return;
    }

    setLoading(true);
    try {
      // The API intentionally returns a generic response to avoid revealing
      // whether an account exists. A successful response means the request was
      // accepted, not that SMTP delivery was confirmed.
      await apiClient.post('/auth/forgot-password', { email: normalizedEmail });
      setEmail(normalizedEmail);
      setRequestSubmitted(true);
      setErrorMessage('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success('Password reset request received');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit request. Try again.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    await requestReset();
  };

  return (
    <div className="container-px flex min-h-[60vh] items-center justify-center py-16">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <h1 className="text-2xl font-medium">Reset password</h1>
        {requestSubmitted ? (
          <div className="mt-4 space-y-4 text-sm text-muted-foreground" aria-live="polite">
            {errorMessage ? <p role="alert" className="text-red-400">{errorMessage}</p> : null}
            <p>
              If an account is associated with this email address, you’ll receive a password reset link. Please check your inbox and spam folder.
            </p>
            <Button
              type="button"
              className="w-full"
              loading={loading}
              disabled={loading || cooldown > 0}
              onClick={requestReset}
            >
              {loading
                ? 'Requesting link...'
                : cooldown > 0
                  ? `Resend link in ${cooldown}s`
                  : 'Resend reset link'}
            </Button>
            <p className="text-xs">
              For your security, we do not reveal whether an email address has an account.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {errorMessage ? <p role="alert" className="text-red-400">{errorMessage}</p> : null}
            <div>
              <label htmlFor="reset-email" className="label-field">Email</label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                aria-describedby="reset-email-help"
              />
              <p id="reset-email-help" className="mt-2 text-xs text-muted-foreground">
                Enter the email address associated with your account.
              </p>
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
