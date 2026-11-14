'use client';

import { useCallback, useEffect, useState } from 'react';
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

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to load the dashboard.';
  if (message.includes('Insufficient') || message.includes('403')) {
    return 'You do not have permission to view the dashboard. Ask a SUPER_ADMIN to grant ADMIN access.';
  }
  if (message.includes('Authentication') || message.includes('401')) {
    return 'Your session has expired. Sign in again.';
  }
  return message || 'Unable to load the dashboard. Please try again.';
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiClient.get<Dash>('/admin/dashboard', { auth: true });
      setData(result);
    } catch (err) {
      setData(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Loading dashboard">
        <Spinner />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass space-y-3 rounded-2xl p-6" role="alert">
        <p className="text-red-400">{error}</p>
        <button type="button" className="btn-secondary" onClick={() => void loadDashboard()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    { label: 'Total orders', value: data.kpis.totalOrders },
    { label: 'Revenue (all time)', value: formatInr(data.kpis.totalRevenue) },
    { label: 'Revenue (this month)', value: formatInr(data.kpis.revenueMonth) },
    { label: 'Orders (this month)', value: data.kpis.ordersMonth },
    { label: 'Orders today', value: data.kpis.ordersToday },
    { label: 'Customers', value: data.kpis.customers },
    { label: 'Active products', value: data.kpis.activeProducts },
    { label: 'Low-stock variants', value: data.kpis.lowStockVariants },
  ];

  const maxRevenue = Math.max(1, ...data.revenueSeries.map((day) => day.revenue));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Store overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue figures include paid orders only. Cancelled, refunded and returned orders are excluded.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void loadDashboard()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-medium tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl p-5" aria-labelledby="revenue-heading">
          <h2 id="revenue-heading" className="font-medium">Paid revenue · last 7 days</h2>
          {data.revenueSeries.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No revenue data available yet.</p>
          ) : (
            <div className="mt-4 flex h-44 items-end gap-2">
              {data.revenueSeries.map((day) => {
                const height = day.revenue > 0 ? Math.max(6, (day.revenue / maxRevenue) * 100) : 0;
                const label = new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'UTC',
                });
                return (
                  <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-center text-[10px] text-muted-foreground" title={formatInr(day.revenue)}>
                      {day.revenue > 0 ? formatInr(day.revenue) : '—'}
                    </span>
                    <div
                      className="w-full rounded-t bg-primary/80"
                      style={{ height: `${height}%` }}
                      title={`${label}: ${formatInr(day.revenue)}`}
                    />
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="glass rounded-2xl p-5" aria-labelledby="status-heading">
          <h2 id="status-heading" className="font-medium">Order status</h2>
          {data.statusBreakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No orders have been placed yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.statusBreakdown.map((status) => (
                <li key={status.status} className="flex items-center justify-between gap-3 text-sm">
                  <Badge variant="outline">{status.status.replaceAll('_', ' ')}</Badge>
                  <span className="tabular-nums">{status.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="glass rounded-2xl p-5" aria-labelledby="recent-orders-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-orders-heading" className="font-medium">Recent orders</h2>
          <span className="text-xs text-muted-foreground">Latest 8</span>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No orders to display yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-3 pr-4">Order</th>
                  <th scope="col" className="pb-3 pr-4">Customer</th>
                  <th scope="col" className="pb-3 pr-4">Status</th>
                  <th scope="col" className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-white/5">
                    <td className="py-3 pr-4 font-medium">{order.orderNumber}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {order.user?.firstName || order.user?.email || 'Guest'}
                    </td>
                    <td className="py-3 pr-4"><Badge>{order.status.replaceAll('_', ' ')}</Badge></td>
                    <td className="py-3 text-right tabular-nums">{formatInr(Number(order.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
