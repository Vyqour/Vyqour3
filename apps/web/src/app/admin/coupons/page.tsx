'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type CouponType = 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';

type Coupon = {
  id: string;
  code: string;
  description?: string | null;
  type: CouponType;
  value: number | string;
  minOrderAmount?: number | string | null;
  maxDiscount?: number | string | null;
  usageLimit?: number | null;
  usageCount: number;
  perUserLimit: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

type DraftForm = {
  localKey: string;
  id?: string;
  code: string;
  description: string;
  type: CouponType;
  value: string;
  minOrderAmount: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  usageCount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  expanded: boolean;
  saving: boolean;
  isNew: boolean;
};

const TYPES: CouponType[] = ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'];

function uid() {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

/** yyyy-MM-ddThh:mm for <input type="datetime-local"> */
function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blankDraft(): DraftForm {
  const now = new Date();
  const inMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    localKey: uid(),
    code: '',
    description: '',
    type: 'PERCENTAGE',
    value: '10',
    minOrderAmount: '',
    maxDiscount: '',
    usageLimit: '',
    perUserLimit: '1',
    usageCount: 0,
    startsAt: toLocalInput(now.toISOString()),
    expiresAt: toLocalInput(inMonth.toISOString()),
    isActive: true,
    expanded: true,
    saving: false,
    isNew: true,
  };
}

function couponToDraft(c: Coupon): DraftForm {
  return {
    localKey: c.id,
    id: c.id,
    code: c.code,
    description: c.description || '',
    type: c.type,
    value: String(c.value ?? ''),
    minOrderAmount: c.minOrderAmount != null ? String(c.minOrderAmount) : '',
    maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : '',
    usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
    perUserLimit: String(c.perUserLimit ?? 1),
    usageCount: c.usageCount ?? 0,
    startsAt: toLocalInput(c.startsAt),
    expiresAt: toLocalInput(c.expiresAt),
    isActive: c.isActive,
    expanded: false,
    saving: false,
    isNew: false,
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

function statusBadge(isActive: boolean) {
  return (
    <Badge variant={isActive ? 'success' : 'outline'} className="uppercase tracking-wide">
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}

export default function AdminCouponsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<DraftForm[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get<unknown>('/coupons?limit=100', { auth: true })
      .then((res) => {
        const list = unwrapList<Coupon>(res);
        setDrafts(list.map(couponToDraft));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load coupons'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateDraft = (localKey: string, patch: Partial<DraftForm>) => {
    setDrafts((prev) => prev.map((d) => (d.localKey === localKey ? { ...d, ...patch } : d)));
  };

  const addNew = () => setDrafts((prev) => [blankDraft(), ...prev]);

  const removeLocalDraft = (localKey: string) => {
    setDrafts((prev) => prev.filter((d) => d.localKey !== localKey));
  };

  const buildPayload = (d: DraftForm) => ({
    code: d.code.trim().toUpperCase(),
    description: d.description.trim() || undefined,
    type: d.type,
    value: Number(d.value),
    minOrderAmount: d.minOrderAmount ? Number(d.minOrderAmount) : undefined,
    maxDiscount: d.maxDiscount ? Number(d.maxDiscount) : undefined,
    usageLimit: d.usageLimit ? Number(d.usageLimit) : undefined,
    perUserLimit: d.perUserLimit ? Number(d.perUserLimit) : undefined,
    startsAt: d.startsAt ? new Date(d.startsAt).toISOString() : undefined,
    expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : undefined,
  });

  const saveDraft = async (d: DraftForm) => {
    if (!d.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    if (!d.value || Number.isNaN(Number(d.value))) {
      toast.error('Value is required');
      return;
    }
    if (!d.startsAt || !d.expiresAt) {
      toast.error('Start and expiry dates are required');
      return;
    }
    updateDraft(d.localKey, { saving: true });
    try {
      if (d.isNew) {
        const created = (await apiClient.post('/coupons', buildPayload(d), {
          auth: true,
        })) as Coupon;
        toast.success('Coupon created');
        setDrafts((prev) =>
          prev.map((x) => (x.localKey === d.localKey ? couponToDraft(created) : x)),
        );
      } else {
        const updated = (await apiClient.patch(`/coupons/${d.id}`, buildPayload(d), {
          auth: true,
        })) as Coupon;
        toast.success('Coupon updated');
        setDrafts((prev) =>
          prev.map((x) => (x.localKey === d.localKey ? couponToDraft(updated) : x)),
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
      updateDraft(d.localKey, { saving: false });
    }
  };

  const toggleActive = async (d: DraftForm) => {
    if (!d.id) return;
    updateDraft(d.localKey, { saving: true });
    try {
      const updated = (await apiClient.patch(
        `/coupons/${d.id}`,
        { isActive: !d.isActive },
        { auth: true },
      )) as Coupon;
      setDrafts((prev) =>
        prev.map((x) => (x.localKey === d.localKey ? couponToDraft(updated) : x)),
      );
      toast.success(updated.isActive ? 'Coupon activated' : 'Coupon deactivated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status');
      updateDraft(d.localKey, { saving: false });
    }
  };

  const removeCoupon = async (d: DraftForm) => {
    if (!d.id) {
      removeLocalDraft(d.localKey);
      return;
    }
    if (!confirm(`Deactivate coupon "${d.code}"? It will stop working immediately.`)) return;
    updateDraft(d.localKey, { saving: true });
    try {
      await apiClient.delete(`/coupons/${d.id}`, { auth: true });
      toast.success('Coupon deactivated');
      setDrafts((prev) =>
        prev.map((x) => (x.localKey === d.localKey ? { ...x, isActive: false, saving: false } : x)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not deactivate coupon');
      updateDraft(d.localKey, { saving: false });
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Coupons ({drafts.length})</h2>
        <Button size="sm" onClick={addNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> New coupon
        </Button>
      </div>

      <div className="space-y-3">
        {drafts.map((d) => (
          <div
            key={d.localKey}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => updateDraft(d.localKey, { expanded: !d.expanded })}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono font-medium text-white">
                      {d.code || 'NEW-CODE'}
                    </span>
                    {d.isNew && (
                      <Badge variant="secondary" className="text-[10px]">
                        DRAFT
                      </Badge>
                    )}
                    {!d.isNew && statusBadge(d.isActive)}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/45">
                    {d.type} · {d.type === 'PERCENTAGE' ? `${d.value}%` : d.type === 'FIXED' ? `₹${d.value}` : 'Free shipping'}
                    {!d.isNew && d.usageLimit && ` · used ${d.usageCount}/${d.usageLimit}`}
                  </p>
                </div>
                <span className="ml-auto text-white/40">
                  {d.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {!d.isNew && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleActive(d)}
                    disabled={d.saving}
                  >
                    {d.saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : d.isActive ? (
                      'Deactivate'
                    ) : (
                      'Activate'
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeCoupon(d)}
                  disabled={d.saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {d.expanded && (
              <div className="space-y-4 border-t border-white/10 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Code *">
                    <Input
                      value={d.code}
                      onChange={(e) =>
                        updateDraft(d.localKey, { code: e.target.value.toUpperCase() })
                      }
                      placeholder="WELCOME10"
                    />
                  </Field>
                  <Field label="Type *">
                    <select
                      value={d.type}
                      onChange={(e) =>
                        updateDraft(d.localKey, { type: e.target.value as CouponType })
                      }
                      className="h-11 w-full rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white"
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Description">
                  <Textarea
                    rows={2}
                    value={d.description}
                    onChange={(e) => updateDraft(d.localKey, { description: e.target.value })}
                    placeholder="Shown to admins only"
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field
                    label={
                      d.type === 'PERCENTAGE'
                        ? 'Value (%) *'
                        : d.type === 'FIXED'
                          ? 'Value (₹) *'
                          : 'Value (unused)'
                    }
                  >
                    <Input
                      type="number"
                      value={d.value}
                      onChange={(e) => updateDraft(d.localKey, { value: e.target.value })}
                      disabled={d.type === 'FREE_SHIPPING'}
                    />
                  </Field>
                  <Field label="Min order amount (₹)">
                    <Input
                      type="number"
                      value={d.minOrderAmount}
                      onChange={(e) => updateDraft(d.localKey, { minOrderAmount: e.target.value })}
                      placeholder="Optional"
                    />
                  </Field>
                  <Field label="Max discount (₹)">
                    <Input
                      type="number"
                      value={d.maxDiscount}
                      onChange={(e) => updateDraft(d.localKey, { maxDiscount: e.target.value })}
                      placeholder="Optional — for % coupons"
                      disabled={d.type !== 'PERCENTAGE'}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Total usage limit">
                    <Input
                      type="number"
                      value={d.usageLimit}
                      onChange={(e) => updateDraft(d.localKey, { usageLimit: e.target.value })}
                      placeholder="Blank = unlimited"
                    />
                  </Field>
                  <Field label="Per-user limit">
                    <Input
                      type="number"
                      value={d.perUserLimit}
                      onChange={(e) => updateDraft(d.localKey, { perUserLimit: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Starts at *">
                    <Input
                      type="datetime-local"
                      value={d.startsAt}
                      onChange={(e) => updateDraft(d.localKey, { startsAt: e.target.value })}
                    />
                  </Field>
                  <Field label="Expires at *">
                    <Input
                      type="datetime-local"
                      value={d.expiresAt}
                      onChange={(e) => updateDraft(d.localKey, { expiresAt: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveDraft(d)} loading={d.saving} className="gap-1.5">
                    <Save className="h-4 w-4" />
                    {d.isNew ? 'Create coupon' : 'Save changes'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!drafts.length && (
          <p className="text-muted-foreground text-sm">No coupons yet — create one above.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-white/45">{label}</span>
      {children}
    </label>
  );
  }
