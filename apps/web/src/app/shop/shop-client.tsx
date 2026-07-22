'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductCard } from '@/components/shared/product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { resolveCategoryImage } from '@/lib/category-image';
import type { Category, Collection, Paginated, Product } from '@/types';

const sorts = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
];

function flattenCategories(rows: Category[]): Category[] {
  const out: Category[] = [];
  for (const r of rows) {
    out.push(r);
    if (r.children?.length) {
      for (const child of r.children) {
        out.push({ ...child, parentId: child.parentId || r.id });
      }
    }
  }
  return out;
}

export function ShopClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const params = {
    page: sp.get('page') || '1',
    search: sp.get('search') || '',
    category: sp.get('category') || '',
    collection: sp.get('collection') || '',
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
    apiClient.get<Collection[]>('/collections').then(setCollections).catch(() => undefined);
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
      .catch(() =>
        setData({
          data: [],
          meta: { total: 0, page: 1, limit: 12, totalPages: 1, hasNext: false, hasPrev: false },
        }),
      )
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

  const roots = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const flat = useMemo(() => flattenCategories(categories), [categories]);
  const selectedRoot = roots.find((c) => c.slug === params.category);
  const subcategories = useMemo(() => {
    if (selectedRoot?.children?.length) return selectedRoot.children;
    if (!params.category) return [];
    const parent = roots.find((r) => r.slug === params.category);
    if (parent) return flat.filter((c) => c.parentId === parent.id);
    return [];
  }, [selectedRoot, params.category, roots, flat]);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-6">
        {collections.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Collections
            </h3>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setParam('collection', '')}
                className={`rounded-lg px-3 py-2 text-left text-sm ${!params.collection ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
              >
                All collections
              </button>
              {collections.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setParam('collection', c.slug)}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${params.collection === c.slug ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </h3>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setParam('category', '')}
              className={`rounded-lg px-3 py-2 text-left text-sm ${!params.category ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              All
            </button>
            {roots.map((c) => (
              <button
                type="button"
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
        {/* Category / subcategory image cards */}
        {!params.category && roots.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {roots.map((c) => {
              const src = resolveCategoryImage(c, 600);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setParam('category', c.slug)}
                  className="group relative min-h-[120px] overflow-hidden rounded-2xl border border-white/10 text-left"
                >
                  <Image
                    src={src}
                    alt={c.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 50vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <span className="absolute bottom-2 left-2 right-2 text-sm font-medium text-white">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {params.category && subcategories.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {subcategories.map((c) => {
              const src = resolveCategoryImage(c, 600);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setParam('category', c.slug)}
                  className="group relative min-h-[110px] overflow-hidden rounded-2xl border border-white/10 text-left"
                >
                  <Image
                    src={src}
                    alt={c.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 50vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <span className="absolute bottom-2 left-2 right-2 text-sm font-medium text-white">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {data ? `${data.meta.total} products` : 'Loading...'}
            {params.search ? ` for “${params.search}”` : ''}
            {params.collection
              ? ` · ${collections.find((c) => c.slug === params.collection)?.name || params.collection}`
              : ''}
            {params.category
              ? ` · ${flat.find((c) => c.slug === params.category)?.name || params.category}`
              : ''}
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
