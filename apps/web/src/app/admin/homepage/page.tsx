'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Save } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatInr } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Category, Collection, Product } from '@/types';

type FlagKey = 'isFeatured' | 'isNewArrival' | 'isBestSeller' | 'isTrending';

const SECTIONS: { key: FlagKey; title: string; hint: string }[] = [
  { key: 'isFeatured', title: 'Featured Products', hint: 'Homepage “Featured Collection” rail' },
  { key: 'isNewArrival', title: 'New Arrivals', hint: 'Homepage new drops rail' },
  { key: 'isBestSeller', title: 'Best Sellers', hint: 'Homepage best sellers rail' },
  { key: 'isTrending', title: 'Trending', hint: 'Homepage trending rail' },
];

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

export default function AdminHomepagePage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, colRes] = await Promise.all([
        apiClient.get('/products/admin/all?limit=100', { auth: true }),
        apiClient.get('/categories?all=true', { auth: true }),
        apiClient.get('/collections?all=true', { auth: true }),
      ]);
      setProducts(unwrapList<Product>(prodRes));
      setCategories(unwrapList<Category>(catRes));
      setCollections(unwrapList<Collection>(colRes));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load homepage data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.slug.toLowerCase().includes(s) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(s)),
    );
  }, [products, q]);

  const toggleProductFlag = async (p: Product, key: FlagKey) => {
    setBusyId(p.id);
    try {
      const next = !p[key];
      const updated = (await apiClient.patch(
        `/products/${p.id}`,
        { [key]: next },
        { auth: true },
      )) as Product;
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated, [key]: next } : x)));
      toast.success(`${p.name}: ${key.replace('is', '')} ${next ? 'on' : 'off'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggleCollectionFeatured = async (c: Collection) => {
    setBusyId(c.id);
    try {
      const next = !c.isFeatured;
      const updated = (await apiClient.patch(
        `/collections/${c.id}`,
        { isFeatured: next },
        { auth: true },
      )) as Collection;
      setCollections((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...updated, isFeatured: next } : x)));
      toast.success(`${c.name} featured ${next ? 'on' : 'off'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const setCategoryActive = async (c: Category, isActive: boolean) => {
    setBusyId(c.id);
    try {
      await apiClient.patch(`/categories/${c.id}`, { isActive }, { auth: true });
      setCategories((prev) =>
        prev.map((x) => {
          if (x.id === c.id) return { ...x, isActive };
          if (x.children) {
            return {
              ...x,
              children: x.children.map((ch) => (ch.id === c.id ? { ...ch, isActive } : ch)),
            };
          }
          return x;
        }),
      );
      toast.success(`${c.name} ${isActive ? 'visible' : 'hidden'} on storefront`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const setSortOrder = async (kind: 'category' | 'collection', id: string, sortOrder: number) => {
    setBusyId(id);
    try {
      const path = kind === 'category' ? `/categories/${id}` : `/collections/${id}`;
      await apiClient.patch(path, { sortOrder }, { auth: true });
      if (kind === 'category') {
        setCategories((prev) => prev.map((x) => (x.id === id ? { ...x, sortOrder } : x)));
      } else {
        setCollections((prev) => prev.map((x) => (x.id === id ? { ...x, sortOrder } : x)));
      }
      toast.success('Display order saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save order');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const flatCategories = categories.flatMap((c) => [c, ...(c.children || [])]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium">Homepage content</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Toggle which products and collections appear on the storefront homepage. Changes save to the database
            immediately.
          </p>
        </div>
        <Button type="button" variant="secondary" className="gap-2" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {SECTIONS.map((sec) => {
        const selected = products.filter((p) => p[sec.key] && p.status === 'ACTIVE');
        return (
          <section key={sec.key} className="glass space-y-4 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">{sec.title}</h3>
                <p className="text-xs text-muted-foreground">{sec.hint}</p>
              </div>
              <Badge variant="outline">{selected.length} active</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.length === 0 && (
                <p className="text-sm text-muted-foreground">None selected — use the product list below.</p>
              )}
              {selected.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => void toggleProductFlag(p, sec.key)}
                  className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs hover:bg-red-500/20"
                  title="Click to remove from section"
                >
                  {p.name} ×
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <section className="glass space-y-4 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium">All products — section assignment</h3>
            <p className="text-xs text-muted-foreground">Search and toggle flags. Only ACTIVE products show on the storefront.</p>
          </div>
          <Input
            className="max-w-xs"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-3 pr-3">Product</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3 pr-3">Price</th>
                {SECTIONS.map((s) => (
                  <th key={s.key} className="pb-3 pr-3">
                    {s.title.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-medium">{p.name}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="outline">{p.status}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{formatInr(Number(p.basePrice))}</td>
                  {SECTIONS.map((s) => (
                    <td key={s.key} className="py-2 pr-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={!!p[s.key]}
                        disabled={busyId === p.id}
                        onChange={() => void toggleProductFlag(p, s.key)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p className="mt-4 text-sm text-muted-foreground">No products match.</p>}
        </div>
      </section>

      <section className="glass space-y-4 rounded-2xl p-5">
        <h3 className="font-medium">Featured collections (homepage)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-3 pr-3">Collection</th>
                <th className="pb-3 pr-3">Active</th>
                <th className="pb-3 pr-3">Featured</th>
                <th className="pb-3 pr-3">Order</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-medium">{c.name}</td>
                  <td className="py-2 pr-3">{c.isActive === false ? 'No' : 'Yes'}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={!!c.isFeatured}
                      disabled={busyId === c.id}
                      onChange={() => void toggleCollectionFeatured(c)}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      className="w-20"
                      type="number"
                      defaultValue={c.sortOrder ?? 0}
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isNaN(n) && n !== (c.sortOrder ?? 0)) void setSortOrder('collection', c.id, n);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass space-y-4 rounded-2xl p-5">
        <h3 className="font-medium">Homepage categories</h3>
        <p className="text-xs text-muted-foreground">
          Active root categories appear in the homepage grid (sorted by display order). Toggle visibility or order here.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-3 pr-3">Category</th>
                <th className="pb-3 pr-3">Visible</th>
                <th className="pb-3 pr-3">Order</th>
              </tr>
            </thead>
            <tbody>
              {flatCategories.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-medium">
                    {c.parentId ? '↳ ' : ''}
                    {c.name}
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={c.isActive !== false}
                      disabled={busyId === c.id}
                      onChange={(e) => void setCategoryActive(c, e.target.checked)}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      className="w-20"
                      type="number"
                      defaultValue={c.sortOrder ?? 0}
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isNaN(n) && n !== (c.sortOrder ?? 0)) void setSortOrder('category', c.id, n);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Save className="h-3.5 w-3.5" /> Order saves when you leave the field. Product images/categories are managed on
          their own admin pages.
        </p>
      </section>
    </div>
  );
}
