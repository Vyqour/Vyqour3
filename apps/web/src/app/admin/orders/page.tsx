'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';

type OrderItem = {
  id: string;
  productName: string;
  variantLabel?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
};

type Address = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number | string;
  createdAt: string;
  qikinkOrderId?: string | null;
  qikinkSyncStatus?: string | null;
  user?: { email?: string; firstName?: string; lastName?: string; phone?: string } | null;
  shippingAddress?: Address | null;
  items?: OrderItem[];
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<unknown>('/orders/admin/all?limit=50', { auth: true })
      .then((res) => {
        if (Array.isArray(res)) setOrders(res as Order[]);
        else if (res && typeof res === 'object' && 'data' in (res as object))
          setOrders(((res as { data: Order[] }).data) || []);
        else setOrders([]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (error) return <p className="text-red-400">{error}</p>;

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} copied`);
    } catch {
      window.prompt(`Copy ${label}:`, text);
    }
  };

  const buildQikinkText = (o: Order) => {
    const addr = o.shippingAddress;
    const customerName =
      addr?.fullName ||
      [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ') ||
      'N/A';
    const itemsText = (o.items || [])
      .map(
        (i) =>
          `  - ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}${
            i.sku ? ` [SKU: ${i.sku}]` : ''
          }`,
      )
      .join('\n');

    return [
      `Order: ${o.orderNumber}`,
      `Payment: ${o.paymentMethod} (${o.paymentStatus})`,
      ``,
      `Customer: ${customerName}`,
      `Phone: ${addr?.phone || o.user?.phone || 'N/A'}`,
      `Email: ${o.user?.email || 'N/A'}`,
      ``,
      `Address:`,
      `  ${addr?.line1 || ''}${addr?.line2 ? `, ${addr.line2}` : ''}`,
      `  ${addr?.city || ''}, ${addr?.state || ''} ${addr?.postalCode || ''}`,
      `  ${addr?.country || 'India'}`,
      ``,
      `Items:`,
      itemsText || '  (none)',
      ``,
      `Total: ₹${o.total}`,
    ].join('\n');
  };

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="font-medium mb-4">Orders ({orders.length})</h2>
      <div className="space-y-3">
        {orders.map((o) => {
          const isOpen = expandedId === o.id;
          const addr = o.shippingAddress;
          const customerName =
            addr?.fullName ||
            [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ') ||
            '—';

          return (
            <div key={o.id} className="rounded-xl border border-white/10">
              <button
                onClick={() => setExpandedId(isOpen ? null : o.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm">{o.orderNumber}</span>
                  <Badge variant="outline">{o.status}</Badge>
                  <Badge variant="outline">{o.paymentMethod}</Badge>
                  {o.qikinkOrderId ? (
                    <span className="text-xs text-green-400">
                      Qikink #{o.qikinkOrderId}
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-400">Not sent to Qikink</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{customerName}</span>
                  <span>₹{o.total}</span>
                  <span>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/10 p-4 text-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-white/50">
                        Customer
                      </h4>
                      <p>{customerName}</p>
                      <p className="text-muted-foreground">
                        {addr?.phone || o.user?.phone || '—'}
                      </p>
                      <p className="text-muted-foreground">{o.user?.email || '—'}</p>
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-white/50">
                        Shipping address
                      </h4>
                      {addr ? (
                        <p className="text-muted-foreground">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ''}
                          <br />
                          {addr.city}, {addr.state} {addr.postalCode}
                          <br />
                          {addr.country}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>

                  <h4 className="mb-2 mt-4 text-xs font-semibold uppercase text-white/50">
                    Items
                  </h4>
                  <div className="space-y-1">
                    {(o.items || []).map((i) => (
                      <div key={i.id} className="flex justify-between text-muted-foreground">
                        <span>
                          {i.productName}
                          {i.variantLabel ? ` (${i.variantLabel})` : ''} × {i.quantity}
                        </span>
                        <span>₹{i.totalPrice}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => copyText(buildQikinkText(o), 'Order details')}
                      className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs text-white hover:bg-primary/20"
                    >
                      Copy details for manual Qikink entry
                    </button>
                    <button
                      onClick={() => copyText(o.id, 'Order ID')}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:text-white"
                    >
                      Copy internal order ID
                    </button>
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-[11px] text-muted-foreground">
                      Debug: raw data (temporary)
                    </summary>
                    <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-black/40 p-3 text-[10px] text-muted-foreground">
                      {JSON.stringify({ shippingAddress: o.shippingAddress, user: o.user }, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!orders.length && (
        <p className="mt-4 text-sm text-muted-foreground">No records yet.</p>
      )}
    </div>
  );
          }
