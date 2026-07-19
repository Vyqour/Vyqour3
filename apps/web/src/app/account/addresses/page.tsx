'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Address } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export default function AddressesPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const load = () =>
    apiClient
      .get<Address[]>('/addresses', { auth: true })
      .then(setList)
      .finally(() => setLoading(false));

  useEffect(() => {
    if (hydrated && !user) router.push('/login');
    if (user) load();
  }, [user, hydrated, router]);

  if (!hydrated || loading) {
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
      <h1 className="mt-4 text-3xl font-medium">Addresses</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {list.map((a) => (
          <div key={a.id} className="glass rounded-2xl p-5">
            <p className="font-medium">
              {a.fullName} {a.isDefault && <span className="text-xs text-primary-glow">Default</span>}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ''}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              {a.phone}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={async () => {
                await apiClient.delete(`/addresses/${a.id}`, { auth: true });
                toast.success('Deleted');
                load();
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>

      <div className="glass mt-10 max-w-xl rounded-2xl p-6">
        <h2 className="font-medium">Add address</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.keys(form).map((k) => (
            <div key={k} className={k.startsWith('line') ? 'sm:col-span-2' : ''}>
              <label className="label-field">{k}</label>
              <Input
                value={form[k as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button
          className="mt-4"
          onClick={async () => {
            try {
              await apiClient.post('/addresses', form, { auth: true });
              toast.success('Saved');
              setForm({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '' });
              load();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed');
            }
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
