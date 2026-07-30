'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatInr } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ImageUploadField } from '@/components/admin/image-upload-field';

type Category = { id: string; name: string; slug: string };

type Collection = { id: string; name: string; slug: string };

type QikinkDesignEntry = {
  placement: string;
  designCode: string;
  designUrl: string;
  mockupUrl?: string;
};

const QIKINK_PLACEMENTS = [
  { value: 'fr', label: 'Front' },
  { value: 'bk', label: 'Back' },
  { value: 'ls', label: 'Left sleeve' },
  { value: 'rs', label: 'Right sleeve' },
];
type ProductImage = {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  publicId?: string;
  sortOrder?: number;
};

type ProductVariant = {
  sku: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  basePrice: number | string;
  compareAtPrice?: number | string | null;
  categoryId: string;
  collectionId?: string | null;
  collection?: { id: string; name: string; slug: string } | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  tags?: string[];
  materials?: string | null;
  careInstructions?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  qikinkSku?: string | null;
  qikinkPrintTypeId?: number | null;
  qikinkDesigns?: QikinkDesignEntry[] | null;
  qikinkSearchFromMyProducts?: number | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
  category?: { id: string; name: string; slug: string };
};

type DraftForm = {
  /** local key for unsaved templates */
  localKey: string;
  id?: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  basePrice: string;
  compareAtPrice: string;
  categoryId: string;
  collectionId: string;
  status: Product['status'];
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  tags: string;
  materials: string;
  careInstructions: string;
  seoTitle: string;
  seoDescription: string;
  imageUrl: string;
  imageAlt: string;
  qikinkSku: string;
  qikinkPrintTypeId: string;
  qikinkSearchFromMyProducts: '0' | '1';
  qikinkDesigns: QikinkDesignEntry[];
  /** variants as simple lines: SKU | size | color | stock | price */
  variantsText: string;
  /** variants as simple lines: SKU | size | color | stock | price */
  variantsText: string;
  expanded: boolean;
  saving: boolean;
  isNew: boolean;
};

const STATUSES: Product['status'][] = ['DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK'];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1e3a5f' },
];

function uid() {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function makeTemplate(categoryId = '', collectionId = ''): DraftForm {
  const n = Math.floor(Math.random() * 900 + 100);
  const name = `New Product ${n}`;
  const slug = slugify(name);
  const variants = SIZES.flatMap((size) =>
    COLORS.map(
      (c) =>
        `${slugify(name)}-${size.toLowerCase()}-${c.name.toLowerCase()} | ${size} | ${c.name} | 10 | `,
    ),
  ).join('\n');

  return {
    localKey: uid(),
    isNew: true,
    expanded: true,
    saving: false,
    name,
    slug,
    description:
      'Premium quality apparel. Soft hand-feel, durable print, everyday fit. Edit this description before publishing.',
    shortDescription: 'Premium everyday essential — edit me.',
    basePrice: '999',
    compareAtPrice: '1499',
    categoryId,
    collectionId,
    status: 'DRAFT',
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    isTrending: false,
    tags: 'new, apparel',
    materials: '100% cotton',
    careInstructions: 'Machine wash cold. Do not bleach. Tumble dry low.',
    seoTitle: name,
    seoDescription: 'Shop premium quality apparel at VYQOUR.',
    imageUrl: 'https://placehold.co/800x1000/111111/FFFFFF/png?text=VYQOUR',
    imageAlt: name,
    qikinkSku: '',
    qikinkPrintTypeId: '1',
    qikinkSearchFromMyProducts: '1',
    qikinkDesigns: [],
    variantsText: variants,
  };
    }

function productToDraft(p: Product): DraftForm {
  const variantsText = (p.variants || [])
    .map((v) =>
      [v.sku, v.size || '', v.color || '', v.stock ?? 0, v.price ?? ''].join(' | '),
    )
    .join('\n');
  const primary =
    p.images?.find((i) => i.isPrimary) || p.images?.[0] || ({ url: '', alt: '' } as ProductImage);

  return {
    localKey: p.id,
    id: p.id,
    isNew: false,
    expanded: false,
    saving: false,
    name: p.name || '',
    slug: p.slug || '',
    description: p.description || '',
    shortDescription: p.shortDescription || '',
    basePrice: String(p.basePrice ?? ''),
    compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : '',
    categoryId: p.categoryId || p.category?.id || '',
    collectionId: p.collectionId || p.collection?.id || '',
    status: p.status || 'DRAFT',
    isFeatured: !!p.isFeatured,
    isNewArrival: !!p.isNewArrival,
    isBestSeller: !!p.isBestSeller,
    isTrending: !!p.isTrending,
    tags: (p.tags || []).join(', '),
    materials: p.materials || '',
    careInstructions: p.careInstructions || '',
    seoTitle: p.seoTitle || '',
    seoDescription: p.seoDescription || '',
    imageUrl: primary.url || '',
    imageAlt: primary.alt || p.name || '',
    qikinkSku: p.qikinkSku || '',
    qikinkPrintTypeId: p.qikinkPrintTypeId != null ? String(p.qikinkPrintTypeId) : '1',
    qikinkSearchFromMyProducts: p.qikinkSearchFromMyProducts === 0 ? '0' : '1',
    qikinkDesigns: Array.isArray(p.qikinkDesigns)
      ? p.qikinkDesigns.map((d) => ({
          placement: d.placement || 'fr',
          designCode: d.designCode || '',
          designUrl: d.designUrl || '',
          mockupUrl: d.mockupUrl || '',
        }))
      : [],
    variantsText,
  };
    }

function parseVariants(text: string, fallbackPrice: number): ProductVariant[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const parts = line.split('|').map((p) => p.trim());
      const [sku, size, color, stock, price] = parts;
      const colorMeta = COLORS.find((c) => c.name.toLowerCase() === (color || '').toLowerCase());
      return {
        sku: sku || `SKU-${idx + 1}`,
        size: size || undefined,
        color: color || undefined,
        colorHex: colorMeta?.hex,
        stock: stock !== undefined && stock !== '' ? Number(stock) : 0,
        price: price !== undefined && price !== '' ? Number(price) : fallbackPrice,
      };
    })
    .filter((v) => v.sku);
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function statusBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'sale'> = {
    ACTIVE: 'success',
    DRAFT: 'secondary',
    ARCHIVED: 'outline',
    OUT_OF_STOCK: 'sale',
  };
  return (
    <Badge variant={map[status] || 'secondary'} className="uppercase tracking-wide">
      {status}
    </Badge>
  );
}

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [drafts, setDrafts] = useState<DraftForm[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prodRes, catRes, colRes] = await Promise.all([
        apiClient.get('/products/admin/all?limit=100', { auth: true }),
        apiClient.get('/categories?all=true', { auth: true }),
        apiClient.get('/collections?all=true', { auth: true }),
      ]);
      const products = unwrapList<Product>(prodRes);
      const cats = unwrapList<Category>(catRes);
      const cols = unwrapList<Collection>(colRes);
      setCategories(cats);
      setCollections(cols);
      setDrafts(products.map(productToDraft));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const defaultCategoryId = categories[0]?.id || '';
  const defaultCollectionId = collections[0]?.id || '';

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return drafts.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && d.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.tags.toLowerCase().includes(q)
      );
    });
  }, [drafts, filter, statusFilter, categoryFilter]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, { label: string; items: typeof visible }>();
    for (const d of visible) {
      const cat = categories.find((c) => c.id === d.categoryId);
      const key = d.categoryId || 'uncategorized';
      const label = cat?.name || 'Uncategorized';
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(d);
    }
    // Prefer known category order from categories list
    const ordered: { key: string; label: string; items: typeof visible }[] = [];
    for (const c of categories) {
      const g = map.get(c.id);
      if (g) ordered.push({ key: c.id, label: g.label, items: g.items });
      map.delete(c.id);
    }
    for (const [key, g] of map) ordered.push({ key, label: g.label, items: g.items });
    return ordered;
  }, [visible, categories]);

  const updateDraft = (localKey: string, patch: Partial<DraftForm>) => {
    setDrafts((prev) => prev.map((d) => (d.localKey === localKey ? { ...d, ...patch } : d)));
  };

  const addTemplate = () => {
    const tpl = makeTemplate(defaultCategoryId, defaultCollectionId);
    setDrafts((prev) => [tpl, ...prev]);
    toast.success('Product template added — fill details and Save');
    // scroll top
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildPayload = (d: DraftForm) => {
    const basePrice = Number(d.basePrice);
    if (!d.name.trim()) throw new Error('Name is required');
    if (!d.description.trim()) throw new Error('Description is required');
    if (!d.categoryId) throw new Error('Category is required');
    if (Number.isNaN(basePrice) || basePrice < 0) throw new Error('Valid base price is required');

    const variants = parseVariants(d.variantsText, basePrice);
    const images = d.imageUrl.trim()
      ? [
          {
            url: d.imageUrl.trim(),
            alt: d.imageAlt.trim() || d.name,
            isPrimary: true,
            sortOrder: 0,
          },
        ]
      : undefined;

    return {
      name: d.name.trim(),
      slug: d.slug.trim() || undefined,
      description: d.description.trim(),
      shortDescription: d.shortDescription.trim() || undefined,
      basePrice,
      compareAtPrice: d.compareAtPrice ? Number(d.compareAtPrice) : undefined,
      categoryId: d.categoryId,
      collectionId: d.collectionId || undefined,
      status: d.status,
      isFeatured: d.isFeatured,
      isNewArrival: d.isNewArrival,
      isBestSeller: d.isBestSeller,
      isTrending: d.isTrending,
      tags: d.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      materials: d.materials.trim() || undefined,
      careInstructions: d.careInstructions.trim() || undefined,
      seoTitle: d.seoTitle.trim() || undefined,
      seoDescription: d.seoDescription.trim() || undefined,
      qikinkSku: d.qikinkSku.trim() || undefined,
      qikinkPrintTypeId: d.qikinkPrintTypeId ? Number(d.qikinkPrintTypeId) : undefined,
      qikinkSearchFromMyProducts: Number(d.qikinkSearchFromMyProducts),
      qikinkDesigns:
        d.qikinkDesigns.filter((x) => x.designUrl.trim()).length > 0
          ? d.qikinkDesigns
              .filter((x) => x.designUrl.trim())
              .map((x) => ({
                placement: x.placement,
                designCode: x.designCode.trim() || undefined,
                designUrl: x.designUrl.trim(),
                mockupUrl: x.mockupUrl?.trim() || undefined,
              }))
          : undefined,
      images,
      // variants only on create (API update does not replace variants yet)
      ...(d.isNew ? { variants } : {}),
    };
  };

  const saveDraft = async (localKey: string) => {
    const d = drafts.find((x) => x.localKey === localKey);
    if (!d) return;
    updateDraft(localKey, { saving: true });
    try {
      const payload = buildPayload(d);
      if (d.isNew || !d.id) {
        const created = (await apiClient.post('/products', payload, { auth: true })) as Product;
        toast.success(`Created “${created.name}”`);
        // replace local template with server product
        setDrafts((prev) =>
          prev.map((x) =>
            x.localKey === localKey
              ? { ...productToDraft(created), expanded: true, saving: false }
              : x,
          ),
        );
      } else {
        const updated = (await apiClient.patch(`/products/${d.id}`, payload, {
          auth: true,
        })) as Product;
        toast.success(`Saved “${updated.name}”`);
        setDrafts((prev) =>
          prev.map((x) =>
            x.localKey === localKey
              ? { ...productToDraft(updated), expanded: true, saving: false }
              : x,
          ),
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
      updateDraft(localKey, { saving: false });
    }
  };

  const archiveProduct = async (localKey: string) => {
    const d = drafts.find((x) => x.localKey === localKey);
    if (!d) return;

    // Unsaved template — just remove from UI
    if (d.isNew || !d.id) {
      setDrafts((prev) => prev.filter((x) => x.localKey !== localKey));
      toast.message('Template discarded');
      return;
    }

    if (!confirm(`Archive “${d.name}”? It will be hidden from the storefront.`)) return;
    try {
      await apiClient.delete(`/products/${d.id}`, { auth: true });
      toast.success('Product archived');
      updateDraft(localKey, { status: 'ARCHIVED' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Archive failed');
    }
  };

  const hardDelete = async (localKey: string) => {
    const d = drafts.find((x) => x.localKey === localKey);
    if (!d?.id || d.isNew) {
      setDrafts((prev) => prev.filter((x) => x.localKey !== localKey));
      return;
    }
    if (
      !confirm(
        `PERMANENTLY delete “${d.name}”? This cannot be undone. Prefer Archive if unsure.`,
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/products/${d.id}?hard=true`, { auth: true });
      setDrafts((prev) => prev.filter((x) => x.localKey !== localKey));
      toast.success('Product deleted');
    } catch (e) {
      // fallback: if API ignores hard flag, still archived
      toast.error(e instanceof Error ? e.message : 'Delete failed');
      await load();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-400">{error}</p>
        <Button onClick={() => void load()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Products</h2>
          <p className="mt-1 text-sm text-white/50">
            Click <span className="text-white/80">+</span> to add a filled template, edit fields,
            then Save. Archive or delete to remove.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={addTemplate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add product
          </Button>
          <Button type="button" variant="secondary" size="icon" onClick={addTemplate} title="Add template">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search name, slug, tags…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="sm:max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white"
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white"
        >
          <option value="ALL">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="ghost" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {!categories.length && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No categories found. Create a category under Admin → Categories before saving products.
        </div>
      )}

      <div className="space-y-8">
        {groupedByCategory.map((group) => (
          <section key={group.key} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
                {group.label}
                <span className="ml-2 text-white/30">({group.items.length})</span>
              </h3>
            </div>
            <div className="space-y-4">
        {group.items.map((d) => {
          const priceNum = Number(d.basePrice);
          return (
            <div
              key={d.localKey}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              {/* Row header */}
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() => updateDraft(d.localKey, { expanded: !d.expanded })}
                >
                  <div className="mt-0.5 h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    {d.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/30">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-white">
                        {d.name || 'Untitled product'}
                      </span>
                      {d.isNew && (
                        <Badge variant="secondary" className="text-[10px]">
                          TEMPLATE
                        </Badge>
                      )}
                      {statusBadge(d.status)}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/45">
                      {d.slug || 'no-slug'} ·{' '}
                      {Number.isFinite(priceNum) ? formatInr(priceNum) : '—'} ·{' '}
                      {categories.find((c) => c.id === d.categoryId)?.name || 'No category'} · {collections.find((c) => c.id === d.collectionId)?.name || 'No collection'}
                    </p>
                  </div>
                  <span className="ml-auto text-white/40">
                    {d.expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void saveDraft(d.localKey)}
                    disabled={d.saving}
                    className="gap-1.5"
                  >
                    {d.saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void archiveProduct(d.localKey)}
                    className="gap-1.5"
                    title={d.isNew ? 'Discard template' : 'Archive product'}
                  >
                    {d.isNew ? <X className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    {d.isNew ? 'Discard' : 'Archive'}
                  </Button>
                  {!d.isNew && d.id && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void hardDelete(d.localKey)}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded editor */}
              {d.expanded && (
                <div className="space-y-5 border-t border-white/10 p-4 md:p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Name *">
                      <Input
                        value={d.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          updateDraft(d.localKey, {
                            name,
                            slug: d.isNew ? slugify(name) : d.slug,
                            seoTitle: d.isNew ? name : d.seoTitle,
                            imageAlt: d.isNew ? name : d.imageAlt,
                          });
                        }}
                      />
                    </Field>
                    <Field label="Slug">
                      <Input
                        value={d.slug}
                        onChange={(e) => updateDraft(d.localKey, { slug: e.target.value })}
                      />
                    </Field>
                    <Field label="Base price (INR) *">
                      <Input
                        type="number"
                        min={0}
                        value={d.basePrice}
                        onChange={(e) => updateDraft(d.localKey, { basePrice: e.target.value })}
                      />
                    </Field>
                    <Field label="Compare-at price">
                      <Input
                        type="number"
                        min={0}
                        value={d.compareAtPrice}
                        onChange={(e) =>
                          updateDraft(d.localKey, { compareAtPrice: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Category *">
                      <select
                        value={d.categoryId}
                        onChange={(e) => updateDraft(d.localKey, { categoryId: e.target.value })}
                        className="h-11 w-full rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white"
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Collection">
                      <select
                        value={d.collectionId}
                        onChange={(e) => updateDraft(d.localKey, { collectionId: e.target.value })}
                        className="h-11 w-full rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white"
                      >
                        <option value="">No collection</option>
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select
                        value={d.status}
                        onChange={(e) =>
                          updateDraft(d.localKey, {
                            status: e.target.value as Product['status'],
                          })
                        }
                        className="h-11 w-full rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Short description">
                    <Input
                      value={d.shortDescription}
                      onChange={(e) =>
                        updateDraft(d.localKey, { shortDescription: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Description *">
                    <Textarea
                      rows={4}
                      value={d.description}
                      onChange={(e) => updateDraft(d.localKey, { description: e.target.value })}
                    />
                  </Field>

                  <div className="space-y-4">
                    <ImageUploadField
                      label="Primary image"
                      folder="products"
                      value={d.imageUrl}
                      onChange={(url) => updateDraft(d.localKey, { imageUrl: url })}
                      previewClassName="aspect-[4/5]"
                    />
                    <Field label="Image alt text">
                      <Input
                        value={d.imageAlt}
                        onChange={(e) => updateDraft(d.localKey, { imageAlt: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ['isFeatured', 'Featured'],
                        ['isNewArrival', 'New arrival'],
                        ['isBestSeller', 'Best seller'],
                        ['isTrending', 'Trending'],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-2 text-sm text-white/80"
                      >
                        <input
                          type="checkbox"
                          checked={d[key]}
                          onChange={(e) => updateDraft(d.localKey, { [key]: e.target.checked })}
                          className="h-4 w-4 rounded border-white/20 bg-black"
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Tags (comma-separated)">
                      <Input
                        value={d.tags}
                        onChange={(e) => updateDraft(d.localKey, { tags: e.target.value })}
                      />
                    </Field>
                    <Field label="Materials">
                      <Input
                        value={d.materials}
                        onChange={(e) => updateDraft(d.localKey, { materials: e.target.value })}
                      />
                    </Field>
                  </div>

                  <Field label="Care instructions">
                    <Textarea
                      rows={2}
                      value={d.careInstructions}
                      onChange={(e) =>
                        updateDraft(d.localKey, { careInstructions: e.target.value })
                      }
                    />
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="SEO title">
                      <Input
                        value={d.seoTitle}
                        onChange={(e) => updateDraft(d.localKey, { seoTitle: e.target.value })}
                      />
                    </Field>
                    <Field label="SEO description">
                      <Input
                        value={d.seoDescription}
                        onChange={(e) =>
                          updateDraft(d.localKey, { seoDescription: e.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <div className="rounded-xl border border-white/10 p-4">
                    <h4 className="text-sm font-medium text-white">Qikink fulfillment</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Controls exactly what data is sent to Qikink when this product is ordered.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Qikink SKU" hint="Catalog SKU from Qikink's product/SKU list">
                        <Input
                          value={d.qikinkSku}
                          onChange={(e) => updateDraft(d.localKey, { qikinkSku: e.target.value })}
                          placeholder="e.g. TS-RN-BLK-M"
                        />
                      </Field>
                      <Field label="Print type ID" hint="From Qikink's SKU catalog — defaults to 1">
                        <Input
                          type="number"
                          value={d.qikinkPrintTypeId}
                          onChange={(e) =>
                            updateDraft(d.localKey, { qikinkPrintTypeId: e.target.value })
                          }
                        />
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field
                        label="Design source"
                        hint="Catalog = use Qikink's existing product/SKU. Custom = upload your own design artwork below."
                      >
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(d.localKey, { qikinkSearchFromMyProducts: '1' })
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs ${
                              d.qikinkSearchFromMyProducts === '1'
                                ? 'border-primary bg-primary/10 text-white'
                                : 'border-white/10 text-muted-foreground'
                            }`}
                          >
                            Catalog SKU
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(d.localKey, { qikinkSearchFromMyProducts: '0' })
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs ${
                              d.qikinkSearchFromMyProducts === '0'
                                ? 'border-primary bg-primary/10 text-white'
                                : 'border-white/10 text-muted-foreground'
                            }`}
                          >
                            Custom design
                          </button>
                        </div>
                      </Field>
                    </div>

                    {d.qikinkSearchFromMyProducts === '0' && (
                      <div className="mt-4 space-y-4">
                        {d.qikinkDesigns.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No print placements added yet. Add one for each side you print on
                            (e.g. Front, Back).
                          </p>
                        )}

                        {d.qikinkDesigns.map((entry, idx) => (
                          <div
                            key={idx}
                            className="space-y-4 rounded-lg border border-white/10 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-white">
                                Placement {idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(d.localKey, {
                                    qikinkDesigns: d.qikinkDesigns.filter((_, i) => i !== idx),
                                  })
                                }
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <Field label="Print location">
                                <div className="flex flex-wrap gap-2">
                                  {QIKINK_PLACEMENTS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        const next = [...d.qikinkDesigns];
                                        next[idx] = { ...next[idx], placement: opt.value };
                                        updateDraft(d.localKey, { qikinkDesigns: next });
                                      }}
                                      className={`rounded-lg border px-3 py-1.5 text-xs ${
                                        entry.placement === opt.value
                                          ? 'border-primary bg-primary/10 text-white'
                                          : 'border-white/10 text-muted-foreground'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </Field>
                              <Field
                                label="Design code"
                                hint="A short reference code for this design (letters/numbers)"
                              >
                                <Input
                                  value={entry.designCode}
                                  onChange={(e) => {
                                    const next = [...d.qikinkDesigns];
                                    next[idx] = { ...next[idx], designCode: e.target.value };
                                    updateDraft(d.localKey, { qikinkDesigns: next });
                                  }}
                                />
                              </Field>
                            </div>

                            <ImageUploadField
                              folder="qikink-designs"
                              label={`Print-ready design file — ${
                                QIKINK_PLACEMENTS.find((p) => p.value === entry.placement)
                                  ?.label || 'Front'
                              }`}
                              hint="Flat artwork only — no mockup, no mannequin, no shirt. This exact file is sent to Qikink for printing. Never shown to customers."
                              value={entry.designUrl}
                              onChange={(url) => {
                                const next = [...d.qikinkDesigns];
                                next[idx] = { ...next[idx], designUrl: url };
                                updateDraft(d.localKey, { qikinkDesigns: next });
                              }}
                              previewClassName="aspect-square"
                            />

                            <ImageUploadField
                              folder="qikink-mockups"
                              label="Internal reference mockup (optional)"
                              hint="Optional preview for your own reference. Also never shown to customers — customer photos come from the Product Images section above."
                              value={entry.mockupUrl || ''}
                              onChange={(url) => {
                                const next = [...d.qikinkDesigns];
                                next[idx] = { ...next[idx], mockupUrl: url };
                                updateDraft(d.localKey, { qikinkDesigns: next });
                              }}
                              previewClassName="aspect-square"
                            />
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateDraft(d.localKey, {
                              qikinkDesigns: [
                                ...d.qikinkDesigns,
                                { placement: 'fr', designCode: '', designUrl: '', mockupUrl: '' },
                              ],
                            })
                          }
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add print placement
                        </Button>
                      </div>
                    )}
                  </div>

                  <Field
                    label={
                      d.isNew
                        ? 'Variants (one per line: SKU | size | color | stock | price)'
                        : 'Variants (read-only on edit — set on create)'
                    }
                  >
                    <Textarea
                      rows={6}
                      value={d.variantsText}
                      disabled={!d.isNew}
                      onChange={(e) => updateDraft(d.localKey, { variantsText: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </Field>

                  <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                    <Button
                      type="button"
                      onClick={() => void saveDraft(d.localKey)}
                      disabled={d.saving}
                      className="gap-2"
                    >
                      {d.saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {d.isNew ? 'Create product' : 'Save changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateDraft(d.localKey, { expanded: false })}
                    >
                      Collapse
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

            </div>
          </section>
        ))}
        {!visible.length && (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
            <p className="text-white/60">No products yet.</p>
            <Button type="button" className="mt-4 gap-2" onClick={addTemplate}>
              <Plus className="h-4 w-4" />
              Add first product template
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-white/45">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
