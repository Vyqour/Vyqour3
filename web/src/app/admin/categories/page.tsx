'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get<unknown>('/categories?all=true', { auth: true })
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

  const cols = ['name', 'slug'];

  return (
    <div className="glass rounded-2xl p-5 overflow-x-auto">
      <h2 className="font-medium mb-4">Categories ({rows.length})</h2>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c} className="pb-3 pr-4">{c}</th>
            ))}
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
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="text-muted-foreground text-sm mt-4">No records yet.</p>}
    </div>
  );
}
