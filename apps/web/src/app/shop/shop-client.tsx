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
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);

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
    setPriceRange([
      Math.max(0, Math.min(2000, Number(sp.get('minPrice') || 0))),
      Math.max(0, Math.min(2000, Number(sp.get('maxPrice') || 2000))),
    ]);
  }, [sp]);

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

  const isAccessoryCategory = (slug: string) => {
    const category = flat.find((c) => c.slug === slug);
    const accessoryRoot = roots.find((c) => c.slug === 'accessories');
    return slug === 'accessories' || category?.parentId === accessoryRoot?.id;
  };

  const visibleRoots = useMemo(() => {
    if (params.collection === 'accessories') {
      return roots.filter((c) => c.slug === 'accessories');
    }
    if (params.collection === 'clothes') {
      return roots.filter((c) => c.slug !== 'accessories');
    }
    return roots;
  }, [params.collection, roots]);

  const setDepartment = (slug: string) => {
    const q = new URLSearchParams(sp.toString());
    if (slug) q.set('collection', slug);
    else q.delete('collection');
    q.delete('category');
    q.delete('page');
    router.push(`/shop?${q.toString()}`);
  };

  const setCategory = (slug: string) => {
    const q = new URLSearchParams(sp.toString());
    if (slug) q.set('category', slug);
    else q.delete('category');
    // Department is only a UI grouping. Do not send it as a product collection filter.
    q.delete('collection');
    q.delete('page');
    router.push(`/shop?${q.toString()}`);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-6">
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shop by type
          </h3>
          <button
            type="button"
            onClick={() => {
              const q = new URLSearchParams(sp.toString());
              q.delete('collection');
              q.delete('category');
              q.delete('page');
              router.push(`/shop?${q.toString()}`);
            }}
            className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-sm ${!params.collection && !params.category ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            All products
          </button>
          <div className="space-y-2">
            <details open={params.collection === 'clothes' || (!!params.category && !isAccessoryCategory(params.category))}>
              <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/5">
                Clothing
              </summary>
              <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3">
                {roots.filter((c) => c.slug !== 'accessories').map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategory(c.slug)}
                    className={`rounded-lg px-3 py-2 text-left text-sm ${params.category === c.slug ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </details>
            <details open={params.collection === 'accessories' || (!!params.category && isAccessoryCategory(params.category))}>
              <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/5">
                Accessories
              </summary>
              <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3">
                {roots.filter((c) => c.slug === 'accessories').map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategory(c.slug)}
                    className={`rounded-lg px-3 py-2 text-left text-sm ${params.category === c.slug ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
                  >
                    All accessories
                  </button>
                ))}
                {flat.filter((c) => {
                  const root = roots.find((r) => r.slug === 'accessories');
                  return root && c.parentId === root.id;
                }).map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategory(c.slug)}
                    className={`rounded-lg px-3 py-2 text-left text-sm ${params.category === c.slug ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Price range
          </h3>
          <div className="mb-4 flex items-center justify-between text-sm">
            <span>₹{priceRange[0].toLocaleString('en-IN')}</span>
            <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
          </div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="min-price-range">
            Minimum price
          </label>
          <input
            id="min-price-range"
            aria-label="Minimum price"
            type="range"
            min={0}
            max={2000}
            step={50}
            value={priceRange[0]}
            onChange={(e) => {
              const min = Math.min(Number(e.target.value), priceRange[1]);
              setPriceRange([min, priceRange[1]]);
            }}
            onPointerUp={() => {
              const q = new URLSearchParams(sp.toString());
              if (priceRange[0] > 0) q.set('minPrice', String(priceRange[0]));
              else q.delete('minPrice');
              q.set('maxPrice', String(priceRange[1]));
              q.delete('page');
              router.push(`/shop?${q.toString()}`);
            }}
            className="w-full accent-primary"
          />
          <label className="mb-1 mt-3 block text-xs text-muted-foreground" htmlFor="max-price-range">
            Maximum price
          </label>
          <input
            id="max-price-range"
            aria-label="Maximum price"
            type="range"
            min={0}
            max={2000}
            step={50}
            value={priceRange[1]}
            onChange={(e) => {
              const max = Math.max(Number(e.target.value), priceRange[0]);
              setPriceRange([priceRange[0], max]);
            }}
            onPointerUp={() => {
              const q = new URLSearchParams(sp.toString());
              if (priceRange[0] > 0) q.set('minPrice', String(priceRange[0]));
              else q.delete('minPrice');
              q.set('maxPrice', String(priceRange[1]));
              q.delete('page');
              router.push(`/shop?${q.toString()}`);
            }}
            className="w-full accent-primary"
          />
          <button
            type="button"
            onClick={() => {
              setPriceRange([0, 2000]);
              const q = new URLSearchParams(sp.toString());
              q.delete('minPrice');
              q.delete('maxPrice');
              q.delete('page');
              router.push(`/shop?${q.toString()}`);
            }}
            className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-white"
          >
            Reset price
          </button>
        </div>
      </aside>

      <div>
        {/* Category / subcategory image cards */}
        {!params.category && visibleRoots.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {visibleRoots.map((c) => {
              const src = resolveCategoryImage(c, 600);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategory(c.slug)}
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
                  onClick={() => setCategory(c.slug)}
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
