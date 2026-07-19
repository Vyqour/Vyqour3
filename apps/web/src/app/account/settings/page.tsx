'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export default function SettingsPage() {
  const router = useRouter();
  const { user, hydrated, setUser, logout, fetchMe } = useAuthStore();
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (hydrated && !user) router.push('/login');
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user, hydrated, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container-px py-10 md:py-14">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-white">
        ← Account
      </Link>
      <h1 className="mt-4 text-3xl font-medium">Settings</h1>

      <div className="mt-8 grid max-w-xl gap-8">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-medium">Profile</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label-field">First name</label>
              <Input
                value={profile.firstName}
                onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="label-field">Last name</label>
              <Input
                value={profile.lastName}
                onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
              />
            </div>
            <div>
              <label className="label-field">Phone</label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <Button
              onClick={async () => {
                try {
                  const u = await apiClient.patch('/users/me', profile, { auth: true });
                  setUser(u as typeof user);
                  await fetchMe();
                  toast.success('Profile updated');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed');
                }
              }}
            >
              Save profile
            </Button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-medium">Change password</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label-field">Current</label>
              <Input
                type="password"
                value={pw.currentPassword}
                onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="label-field">New</label>
              <Input
                type="password"
                value={pw.newPassword}
                onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await apiClient.post('/auth/change-password', pw, { auth: true });
                  toast.success('Password changed — please sign in again');
                  await logout();
                  router.push('/login');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed');
                }
              }}
            >
              Update password
            </Button>
          </div>
        </div>

        <div className="glass rounded-2xl border border-red-500/20 p-6">
          <h2 className="font-medium text-red-400">Delete account</h2>
          <p className="mt-2 text-sm text-muted-foreground">This permanently deactivates your account.</p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={async () => {
              if (!confirm('Delete your account?')) return;
              await apiClient.delete('/users/me', { auth: true });
              await logout();
              router.push('/');
            }}
          >
            Delete account
          </Button>
        </div>
      </div>
    </div>
  );
}
