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
import { Badge } from '@/components/ui/badge';

type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  _count?: { products: number };
};

type Draft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: string;
  saving?: boolean;
};

function emptyDraft(): Draft {
  return {
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    isActive: true,
    sortOrder: '0',
  };
}

function toDraft(c: CollectionRow): Draft {
  return {
    id: c.id,
    name: c.name || '',
    slug: c.slug || '',
    description: c.description || '',
    imageUrl: c.imageUrl || '',
    isActive: c.isActive !== false,
    sortOrder: String(c.sortOrder ?? 0),
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<unknown>('/collections?all=true', { auth: true });
      setRows(unwrapList<CollectionRow>(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flat = rows;

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return flat;
    return flat.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q),
    );
  }, [flat, filter]);

  const openCreate = () => {
    setEditing(emptyDraft());
  };

  const openEdit = (c: CollectionRow) => {
    setEditing(toDraft(c));
  };

  const closeEditor = () => setEditing(null);

  const save = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      toast.error('Collection name is required');
      return;
    }

    const payload = {
      name,
      slug: editing.slug.trim() || slugify(name),
      description: editing.description.trim() || undefined,
      imageUrl: editing.imageUrl.trim() || undefined,
      isActive: editing.isActive,
      sortOrder: Number.isFinite(Number(editing.sortOrder)) ? Number(editing.sortOrder) : 0,
    };

    setEditing((d) => (d ? { ...d, saving: true } : d));
    try {
      if (editing.id) {
        await apiClient.patch(`/collections/${editing.id}`, payload, { auth: true });
        toast.success(`Updated “${name}”`);
      } else {
        await apiClient.post('/collections', payload, { auth: true });
        toast.success(`Created “${name}”`);
      }
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
      setEditing((d) => (d ? { ...d, saving: false } : d));
    }
  };

  const remove = async (c: CollectionRow) => {
    const productCount = c._count?.products ?? 0;
    const label = productCount
      ? `Archive “${c.name}”? It has ${productCount} product(s). Products keep their assignment; the collection is hidden from the storefront.`
      : `Archive “${c.name}”? It will be set inactive and hidden from the storefront.`;
    if (!confirm(label)) return;
    try {
      await apiClient.delete(`/collections/${c.id}`, { auth: true });
      toast.success(`Archived “${c.name}”`);
      if (editing?.id === c.id) setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-red-400">{error}</p>
        <Button type="button" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Collections</h2>
          <p className="mt-1 text-sm text-white/50">
            Add, edit, or archive collections (e.g. Clothes, Accessories). Assign products from the Products page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add collection
          </Button>
          <Button type="button" variant="ghost" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search name, slug…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="sm:max-w-xs"
      />

      {editing && (
        <div className="glass space-y-4 rounded-2xl border border-white/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-white">
              {editing.id ? 'Edit collection' : 'New collection'}
            </h3>
            <Button type="button" size="icon" variant="ghost" onClick={closeEditor} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-white/45">
                Name *
              </span>
              <Input
                value={editing.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setEditing((d) =>
                    d
                      ? {
                          ...d,
                          name,
                          slug: d.id ? d.slug : d.slug || slugify(name),
                        }
                      : d,
                  );
                }}
                placeholder="e.g. T-Shirts"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-white/45">Slug</span>
              <Input
                value={editing.slug}
                onChange={(e) => setEditing((d) => (d ? { ...d, slug: e.target.value } : d))}
                placeholder="t-shirts"
              />
            </label>
            <label className="block space-y-1.5 md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-white/45">
                Description
              </span>
              <Textarea
                value={editing.description}
                onChange={(e) =>
                  setEditing((d) => (d ? { ...d, description: e.target.value } : d))
                }
                rows={2}
                placeholder="Short blurb for SEO / admin"
              />
            </label>
            <label className="block space-y-1.5 md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-white/45">
                Image URL
              </span>
              <Input
                value={editing.imageUrl}
                onChange={(e) => setEditing((d) => (d ? { ...d, imageUrl: e.target.value } : d))}
                placeholder="https://… (optional — storefront uses mapped photos if empty)"
              />
              <div className="mt-2 h-24 w-24 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveCategoryImage({
                    name: editing.name || 'Collection',
                    slug: editing.slug,
                    imageUrl: editing.imageUrl || null,
                  })}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-white/45">
                Sort order
              </span>
              <Input
                type="number"
                min={0}
                value={editing.sortOrder}
                onChange={(e) => setEditing((d) => (d ? { ...d, sortOrder: e.target.value } : d))}
              />
            </label>
            <label className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) =>
                  setEditing((d) => (d ? { ...d, isActive: e.target.checked } : d))
                }
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              <span className="text-sm text-white/80">Active (visible on storefront)</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void save()} disabled={editing.saving} className="gap-2">
              {editing.saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editing.id ? 'Save changes' : 'Create collection'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeEditor}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="glass overflow-x-auto rounded-2xl p-5">
        <h3 className="mb-4 font-medium">All collections ({visible.length})</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="pb-3 pr-4">Image</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Slug</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Products</th>
              <th className="pb-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const img = resolveCategoryImage(c);
              return (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-3 pr-4">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-white">{c.name}</div>
                    {c.description ? (
                      <p className="mt-0.5 max-w-[220px] truncate text-xs text-white/40">
                        {c.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-white/70">{c.slug}</td>
                  <td className="py-3 pr-4">
                    {c.isActive !== false ? (
                      <Badge className="bg-emerald-500/15 text-emerald-200">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-white/70">{c._count?.products ?? '—'}</td>
                  <td className="py-3 pr-0">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        onClick={() => openEdit(c)}
                      >
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
