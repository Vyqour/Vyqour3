'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';

function TrackForm() {
  const sp = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(sp.get('order') || '');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    orderNumber: string;
    status: string;
    paymentStatus: string;
    trackingNumber?: string;
    carrier?: string;
    statusHistory?: { status: string; note?: string; createdAt: string }[];
    items?: { productName: string; quantity: number }[];
  } | null>(null);

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = email ? `?email=${encodeURIComponent(email)}` : '';
      const data = await apiClient.get<typeof result>(`/orders/track/${orderNumber}${q}`);
      setResult(data);
    } catch (err) {
      setResult(null);
      toast.error(err instanceof Error ? err.message : 'Not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={track} className="glass space-y-4 rounded-3xl p-6 md:p-8">
        <div>
          <label className="label-field">Order number</label>
          <Input required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} placeholder="VYQ..." />
        </div>
        <div>
          <label className="label-field">Email (optional)</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Track
        </Button>
      </form>

      {result && (
        <div className="glass mt-6 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{result.orderNumber}</h2>
            <Badge>{result.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Payment: {result.paymentStatus}</p>
          {result.trackingNumber && (
            <p className="mt-1 text-sm">
              Tracking: {result.trackingNumber} {result.carrier ? `(${result.carrier})` : ''}
            </p>
          )}
          {result.items && (
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {result.items.map((i, idx) => (
                <li key={idx}>
                  {i.productName} × {i.quantity}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
            {result.statusHistory?.map((h, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="font-medium">{h.status}</p>
                  {h.note && <p className="text-muted-foreground">{h.note}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <div className="container-px py-10 md:py-14">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Orders</p>
        <h1 className="mt-2 text-3xl font-medium">Track Order</h1>
      </div>
      <Suspense fallback={<div className="flex justify-center"><Spinner /></div>}>
        <TrackForm />
      </Suspense>
    </div>
  );
}
