'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get<unknown>('/orders/admin/all?limit=50', { auth: true })
      .then((res) => {
        if (Array.isArray(res)) setRows(res as Record<string, unknown>[]);
        else if (res && typeof res === 'object' && 'data' in (res as object))
          setRows(((res as { data: Record<string, unknown>[] }).data) || []);
        else setRows([]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (error) return <p className="text-red-400">{error}</p>;

  const cols = ['orderNumber', 'status', 'total'];

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      alert(`Order ID copied: ${id}`);
    } catch {
      window.prompt('Copy this order ID:', id);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 overflow-x-auto">
      <h2 className="font-medium mb-4">Orders ({rows.length})</h2>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c} className="pb-3 pr-4">{c}</th>
            ))}
            <th className="pb-3 pr-4">Order ID (for Qikink retry)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id || i)} className="border-t border-white/5">
              {cols.map((c) => (
                <td key={c} className="py-3 pr-4 max-w-[240px] truncate">
                  {String(r[c] ?? '—')}
                </td>
              ))}
              <td className="py-3 pr-4">
                {r.id ? (
                  <button
                    onClick={() => copyId(String(r.id))}
                    className="rounded-lg border border-white/10 px-2 py-1 text-xs text-muted-foreground hover:text-white"
                  >
                    Copy ID
                  </button>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="text-muted-foreground text-sm mt-4">No records yet.</p>}
    </div>
  );
        }
