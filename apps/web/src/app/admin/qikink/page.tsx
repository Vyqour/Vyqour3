'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';

type Job = {
  id: string;
  type: string;
  status: string;
  orderId?: string | null;
  attempts: number;
  error?: string | null;
  createdAt: string;
};

type Log = {
  id: string;
  direction: string;
  method?: string | null;
  path?: string | null;
  success: boolean;
  statusCode?: number | null;
  error?: string | null;
  createdAt: string;
};

export default function AdminQikinkPage() {
  const [health, setHealth] = useState<{ enabled: boolean; autoSubmit: boolean } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [orderId, setOrderId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [h, j, l] = await Promise.all([
        apiClient.get<{ enabled: boolean; autoSubmit: boolean }>('/qikink/health'),
        apiClient.get<Job[]>('/qikink/jobs', { auth: true }).catch(() => []),
        apiClient.get<Log[]>('/qikink/logs', { auth: true }).catch(() => []),
      ]);
      setHealth(h);
      setJobs(Array.isArray(j) ? j : []);
      setLogs(Array.isArray(l) ? l : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load Qikink data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Qikink POD</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fulfillment automation · order submit · webhooks · retries
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={health?.enabled ? 'success' : 'outline'}>
              {health?.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Badge variant="secondary">
              Auto-submit: {health?.autoSubmit ? 'on' : 'off'}
            </Badge>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            loading={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                const res = await apiClient.post<{ result?: { note?: string; error?: string; imported?: number } }>(
                  '/qikink/products/sync',
                  {},
                  { auth: true },
                );
                toast.message(
                  res.result?.note ||
                    res.result?.error ||
                    `Synced ${res.result?.imported ?? 0} catalog rows`,
                );
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Sync failed');
              } finally {
                setSyncing(false);
              }
            }}
          >
            Sync products
          </Button>
          <Button variant="ghost" onClick={load}>
            Refresh
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="input-field max-w-sm"
            placeholder="Internal order ID to submit/retry"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
          <Button
            disabled={!orderId}
            onClick={async () => {
              try {
                await apiClient.post(`/qikink/orders/${orderId}/submit`, {}, { auth: true });
                toast.success('Submit queued');
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed');
              }
            }}
          >
            Queue submit
          </Button>
          <Button
            variant="secondary"
            disabled={!orderId}
            onClick={async () => {
              try {
                await apiClient.post(`/qikink/orders/${orderId}/retry`, {}, { auth: true });
                toast.success('Retry queued');
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed');
              }
            }}
          >
            Retry failed
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Webhook URL: <code className="text-primary-glow">POST /api/v1/qikink/webhooks</code>
          {' · '}
          Razorpay:{' '}
          <code className="text-primary-glow">POST /api/v1/payments/webhooks/razorpay</code>
        </p>
      </div>

      <div className="glass overflow-x-auto rounded-2xl p-5">
        <h3 className="mb-3 font-medium">Jobs</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="pb-2 pr-3">Type</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Order</th>
              <th className="pb-2 pr-3">Attempts</th>
              <th className="pb-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-white/5">
                <td className="py-2 pr-3">{j.type}</td>
                <td className="py-2 pr-3">
                  <Badge variant="outline">{j.status}</Badge>
                </td>
                <td className="py-2 pr-3 font-mono text-xs">{j.orderId || '—'}</td>
                <td className="py-2 pr-3">{j.attempts}</td>
                <td className="max-w-[280px] truncate py-2 text-xs text-red-400">{j.error || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!jobs.length && <p className="mt-3 text-sm text-muted-foreground">No jobs yet.</p>}
      </div>

      <div className="glass overflow-x-auto rounded-2xl p-5">
        <h3 className="mb-3 font-medium">API logs</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="pb-2 pr-3">Dir</th>
              <th className="pb-2 pr-3">Method</th>
              <th className="pb-2 pr-3">Path</th>
              <th className="pb-2 pr-3">OK</th>
              <th className="pb-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-white/5">
                <td className="py-2 pr-3">{l.direction}</td>
                <td className="py-2 pr-3">{l.method}</td>
                <td className="py-2 pr-3 font-mono text-xs">{l.path}</td>
                <td className="py-2 pr-3">{l.success ? '✓' : '✗'}</td>
                <td className="max-w-[280px] truncate py-2 text-xs text-red-400">{l.error || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && <p className="mt-3 text-sm text-muted-foreground">No API logs yet.</p>}
      </div>
    </div>
  );
}
