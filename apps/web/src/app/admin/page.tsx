'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { formatInr } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';

type Dash = {
  kpis: {
    totalOrders: number;
    ordersToday: number;
    ordersMonth: number;
    totalRevenue: number;
    revenueMonth: number;
    customers: number;
    activeProducts: number;
    lowStockVariants: number;
  };
  revenueSeries: { date: string; revenue: number; orders: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    total: string | number;
    status: string;
    user?: { firstName?: string; email?: string };
  }[];
  statusBreakdown: { status: string; count: number }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<Dash>('/admin/dashboard', { auth: true })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load';
        setErr(
          msg.includes('Insufficient') || msg.includes('403')
            ? 'You do not have permission to view the dashboard. Ask a SUPER_ADMIN to grant ADMIN access.'
            : msg.includes('Authentication') || msg.includes('401')
              ? 'Session expired — sign in again.'
              : msg || 'Failed to load dashboard',
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err)
    return (
      <div className="glass space-y-3 rounded-2xl p-6">
        <p className="text-red-400">{err}</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setErr('');
            setData(null);
            apiClient
              .get<Dash>('/admin/dashboard', { auth: true })
              .then(setData)
              .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
          }}
        >
          Retry
        </button>
      </div>
    );
  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const cards = [
    { label: 'Revenue (month)', value: formatInr(data.kpis.revenueMonth) },
    { label: 'Orders (month)', value: data.kpis.ordersMonth },
    { label: 'Orders today', value: data.kpis.ordersToday },
    { label: 'Customers', value: data.kpis.customers },
    { label: 'Active products', value: data.kpis.activeProducts },
    { label: 'Low stock SKUs', value: data.kpis.lowStockVariants },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-2xl font-medium">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-medium">7-day revenue</h2>
          <div className="mt-4 flex h-40 items-end gap-2">
            {data.revenueSeries.map((d) => {
              const max = Math.max(...data.revenueSeries.map((x) => x.revenue), 1);
              const h = Math.max(8, (d.revenue / max) * 100);
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t bg-primary/80" style={{ height: `${h}%` }} title={formatInr(d.revenue)} />
                  <span className="text-[10px] text-muted-foreground">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-medium">Order status</h2>
          <ul className="mt-4 space-y-2">
            {data.statusBreakdown.map((s) => (
              <li key={s.status} className="flex items-center justify-between text-sm">
                <Badge variant="outline">{s.status}</Badge>
                <span>{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="font-medium">Recent orders</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">Order</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-white/5">
                  <td className="py-3 pr-4 font-medium">{o.orderNumber}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {o.user?.firstName || o.user?.email}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge>{o.status}</Badge>
                  </td>
                  <td className="py-3">{formatInr(Number(o.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
