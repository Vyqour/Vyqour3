'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { resolveCategoryImage } from '@/lib/category-image';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { Badge } from '@/components/ui/badge';

type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  featuredImageUrl?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  _count?: { products: number };
};

type ProductOpt = { id: string; name: string; slug: string; status?: string };

type Draft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  bannerUrl: string;
  featuredImageUrl: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
  productIds: string[];
  saving?: boolean;
};

function emptyDraft(): Draft {
  return {
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    bannerUrl: '',
    featuredImageUrl: '',
    isActive: true,
    isFeatured: false,
    sortOrder: '0',
    productIds: [],
  };
}

function toDraft(c: CollectionRow, productIds: string[] = []): Draft {
  return {
    id: c.id,
    name: c.name || '',
    slug: c.slug || '',
    description: c.description || '',
    imageUrl: c.imageUrl || '',
    bannerUrl: c.bannerUrl || '',
    featuredImageUrl: c.featuredImageUrl || '',
    isActive: c.isActive !== false,
    isFeatured: !!c.isFeatured,
    sortOrder: String(c.sortOrder ?? 0),
    productIds,
  };
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCollectionsPage() {
  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [colRes, prodRes] = await Promise.all([
        apiClient.get('/collections?all=true', { auth: true }),
        apiClient.get('/products/admin/all?limit=100', { auth: true }),
      ]);
      setRows(unwrapList<CollectionRow>(colRes));
      const prods = unwrapList<ProductOpt>(prodRes);
      setProducts(prods.map((p) => ({ id: p.id, name: p.name, slug: p.slug, status: (p as { status?: string }).status })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q),
    );
  }, [rows, filter]);

  const openCreate = () => setDraft(emptyDraft());

  const openEdit = async (c: CollectionRow) => {
    let productIds: string[] = [];
    try {
      const list = await apiClient.get<ProductOpt[]>(`/collections/admin/${c.id}/products`, {
        auth: true,
      });
      productIds = unwrapList<ProductOpt>(list).map((p) => p.id);
    } catch {
      // fallback: match from loaded products by collection if present
      productIds = [];
    }
    setDraft(toDraft(c, productIds));
  };

  const closeDraft = () => setDraft(null);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setDraft({ ...draft, saving: true });
    const payload = {
      name: draft.name.trim(),
      slug: draft.slug.trim() || slugify(draft.name),
      description: draft.description.trim() || undefined,
      imageUrl: draft.imageUrl.trim() || undefined,
      bannerUrl: draft.bannerUrl.trim() || undefined,
      featuredImageUrl: draft.featuredImageUrl.trim() || undefined,
      isActive: draft.isActive,
      isFeatured: draft.isFeatured,
      sortOrder: Number(draft.sortOrder) || 0,
      productIds: draft.productIds,
    };
    try {
      if (draft.id) {
        await apiClient.patch(`/collections/${draft.id}`, payload, { auth: true });
        toast.success('Collection updated');
      } else {
        await apiClient.post('/collections', payload, { auth: true });
        toast.success('Collection created');
      }
      setDraft(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
      setDraft({ ...draft, saving: false });
    }
  };

  const remove = async (c: CollectionRow) => {
    const productCount = c._count?.products ?? 0;
    const label = productCount
      ? `Archive “${c.name}”? It has ${productCount} product(s). Products keep history; the collection is hidden.`
      : `Archive “${c.name}”?`;
    if (!confirm(label)) return;
    try {
      await apiClient.delete(`/collections/${c.id}`, { auth: true });
      toast.success('Collection archived');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const toggleProduct = (id: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      productIds: draft.productIds.includes(id)
        ? draft.productIds.filter((x) => x !== id)
        : [...draft.productIds, id],
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium">Collections</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Add, edit, or archive collections. Assign products, banners, and homepage featured state. Storefront
            Collections page reads this live from the API.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-48"
            placeholder="Search…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Button type="button" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add collection
          </Button>
        </div>
      </div>

      {draft && (
        <div className="glass space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{draft.id ? 'Edit collection' : 'New collection'}</h3>
            <button type="button" onClick={closeDraft} className="text-muted-foreground hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs uppercase text-white/45">Name</span>
              <Input
                value={draft.name}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    name: e.target.value,
                    slug: draft.id ? draft.slug : slugify(e.target.value),
                  })
                }
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase text-white/45">Slug</span>
              <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            </label>
            <label className="block space-y-1.5 md:col-span-2">
              <span className="text-xs uppercase text-white/45">Description</span>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={3}
              />
            </label>
            <ImageUploadField
              label="Card image"
              folder="collections"
              value={draft.imageUrl}
              onChange={(url) => setDraft({ ...draft, imageUrl: url })}
            />
            <ImageUploadField
              label="Featured image"
              folder="collections"
              value={draft.featuredImageUrl}
              onChange={(url) => setDraft({ ...draft, featuredImageUrl: url })}
            />
            <div className="md:col-span-2">
              <ImageUploadField
                label="Banner image"
                folder="collections"
                value={draft.bannerUrl}
                onChange={(url) => setDraft({ ...draft, bannerUrl: url })}
                previewClassName="aspect-[21/9]"
              />
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase text-white/45">Display order</span>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={draft.isFeatured}
                  onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })}
                />
                Featured on homepage
              </label>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase text-white/45">
              Products in collection ({draft.productIds.length})
            </p>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 p-3">
              {products.length === 0 && (
                <p className="text-sm text-muted-foreground">No products yet — create products first.</p>
              )}
              <div className="grid gap-1 sm:grid-cols-2">
                {products.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={draft.productIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                    />
                    <span className="truncate">{p.name}</span>
                    {p.status && p.status !== 'ACTIVE' && (
                      <Badge variant="outline" className="text-[10px]">
                        {p.status}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeDraft}>
              Cancel
            </Button>
            <Button type="button" className="gap-2" disabled={draft.saving} onClick={() => void save()}>
              {draft.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      )}

      <div className="glass overflow-x-auto rounded-2xl p-5">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="pb-3 pr-4">Collection</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Featured</th>
              <th className="pb-3 pr-4">Order</th>
              <th className="pb-3 pr-4">Products</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const thumb = resolveCategoryImage(
                {
                  name: c.name,
                  slug: c.slug,
                  imageUrl: c.featuredImageUrl || c.imageUrl,
                },
                120,
              );
              return (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={c.isActive === false ? 'outline' : 'default'}>
                      {c.isActive === false ? 'Archived' : 'Active'}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">{c.isFeatured ? 'Yes' : '—'}</td>
                  <td className="py-3 pr-4">{c.sortOrder ?? 0}</td>
                  <td className="py-3 pr-4 text-white/70">{c._count?.products ?? '—'}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={() => void openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => void remove(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && (
          <p className="mt-4 text-sm text-muted-foreground">No collections yet. Add one above.</p>
        )}
      </div>
    </div>
  );
    }
      
