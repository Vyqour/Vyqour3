'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductCard } from '@/components/shared/product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import type { Category, Paginated, Product } from '@/types';

const sorts = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
];

export function ShopClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const params = {
    page: sp.get('page') || '1',
    search: sp.get('search') || '',
    category: sp.get('category') || '',
    sortBy: sp.get('sortBy') || 'newest',
    minPrice: sp.get('minPrice') || '',
    maxPrice: sp.get('maxPrice') || '',
    featured: sp.get('featured') || '',
    newArrival: sp.get('newArrival') || '',
    bestSeller: sp.get('bestSeller') || '',
    trending: sp.get('trending') || '',
  };

  useEffect(() => {
    apiClient.get<Category[]>('/categories').then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    q.set('limit', '12');
    apiClient
      .get<Paginated<Product>>(`/products?${q.toString()}`)
      .then(setData)
      .catch(() => setData({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1, hasNext: false, hasPrev: false } }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const setParam = (key: string, value: string) => {
    const q = new URLSearchParams(sp.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    if (key !== 'page') q.delete('page');
    router.push(`/shop?${q.toString()}`);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-6">
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </h3>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setParam('category', '')}
              className={`rounded-lg px-3 py-2 text-left text-sm ${!params.category ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              All
            </button>
            {categories
              .filter((c) => !c.parentId)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => setParam('category', c.slug)}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${params.category === c.slug ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
                >
                  {c.name}
                </button>
              ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Price (₹)
          </h3>
          <div className="flex gap-2">
            <input
              className="input-field"
              placeholder="Min"
              defaultValue={params.minPrice}
              onBlur={(e) => setParam('minPrice', e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Max"
              defaultValue={params.maxPrice}
              onBlur={(e) => setParam('maxPrice', e.target.value)}
            />
          </div>
        </div>
      </aside>

      <div>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {data ? `${data.meta.total} products` : 'Loading...'}
            {params.search ? ` for “${params.search}”` : ''}
          </p>
          <select
            className="input-field max-w-xs"
            value={params.sortBy}
            onChange={(e) => setParam('sortBy', e.target.value)}
          >
            {sorts.map((s) => (
              <option key={s.value} value={s.value} className="bg-black">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : !data?.data?.length ? (
          <EmptyState
            title="No products found"
            description="Try adjusting filters or browse the full catalog."
            actionLabel="Clear filters"
            actionHref="/shop"
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {data.data.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
            {data.meta.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  disabled={!data.meta.hasPrev}
                  onClick={() => setParam('page', String(data.meta.page - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {data.meta.page} / {data.meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={!data.meta.hasNext}
                  onClick={() => setParam('page', String(data.meta.page + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
