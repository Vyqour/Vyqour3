'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Order, Paginated } from '@/types';
import { formatInr } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

export default function OrdersPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hydrated && !user) router.push('/login');
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get<Paginated<Order>>('/orders/mine', { auth: true })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user]);

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
      <h1 className="mt-4 text-3xl font-medium">Orders</h1>
      {!data?.data?.length ? (
        <div className="mt-10">
          <EmptyState title="No orders yet" actionLabel="Start shopping" actionHref="/shop" />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {data.data.map((o) => (
            <div key={o.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <Badge>{o.status}</Badge>
                  <p className="mt-2 font-semibold">{formatInr(Number(o.total))}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(' · ')}
              </p>
              <Link
                href={`/track-order?order=${o.orderNumber}`}
                className="mt-3 inline-block text-sm text-primary-glow"
              >
                Track order →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
