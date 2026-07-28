'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Role = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' | 'SUPPORT';
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';

type UserRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: Role;
  status: UserStatus;
  emailVerified?: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  _count?: { orders: number };
};

/** Roles assignable from this screen — backend rejects SUPER_ADMIN via this endpoint */
const ASSIGNABLE_ROLES: Role[] = ['CUSTOMER', 'SUPPORT', 'ADMIN'];

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function statusBadge(status: UserStatus) {
  const map: Record<UserStatus, 'success' | 'outline' | 'sale' | 'secondary'> = {
    ACTIVE: 'success',
    INACTIVE: 'outline',
    SUSPENDED: 'sale',
    DELETED: 'secondary',
  };
  return (
    <Badge variant={map[status]} className="uppercase tracking-wide">
      {status}
    </Badge>
  );
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (search.trim()) params.set('search', search.trim());
    if (roleFilter !== 'ALL') params.set('role', roleFilter);
    apiClient
      .get<unknown>(`/users/admin/all?${params.toString()}`, { auth: true })
      .then((res) => setRows(unwrapList<UserRow>(res)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  const changeRole = async (user: UserRow, role: Role) => {
    if (role === user.role) return;
    setBusyId(user.id);
    try {
      const updated = (await apiClient.patch(`/users/admin/${user.id}/role`, { role }, {
        auth: true,
      })) as UserRow;
      setRows((prev) => prev.map((r) => (r.id === user.id ? { ...r, role: updated.role } : r)));
      toast.success(`Role updated to ${role}`);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not update role — only a Super Admin can change roles',
      );
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (user: UserRow, status: UserStatus) => {
    if (status === user.status) return;
    setBusyId(user.id);
    try {
      const updated = (await apiClient.patch(`/users/admin/${user.id}/status`, { status }, {
        auth: true,
      })) as UserRow;
      setRows((prev) => prev.map((r) => (r.id === user.id ? { ...r, status: updated.status } : r)));
      toast.success(`User ${status === 'ACTIVE' ? 'activated' : status.toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-medium">Users ({rows.length})</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="w-56 pl-9"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | Role)}
            className="h-11 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white"
          >
            <option value="ALL">All roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="SUPPORT">Support</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Orders</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="py-3 pr-4 max-w-[160px] truncate">
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-3 pr-4 max-w-[220px] truncate text-white/70">{u.email}</td>
                  <td className="py-3 pr-4 text-white/60">{u._count?.orders ?? 0}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={u.role}
                      disabled={busyId === u.id || u.role === 'SUPER_ADMIN'}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="h-9 rounded-full border border-white/15 bg-white/5 px-3 text-xs text-white disabled:opacity-50"
                    >
                      {u.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r === 'CUSTOMER' ? 'Customer' : r === 'SUPPORT' ? 'Support' : 'Admin'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {statusBadge(u.status)}
                      {busyId === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
                      ) : u.status === 'DELETED' ? null : (
                        <select
                          value={u.status}
                          disabled={busyId === u.id}
                          onChange={(e) => changeStatus(u, e.target.value as UserStatus)}
                          className="h-8 rounded-full border border-white/15 bg-white/5 px-2 text-[11px] text-white disabled:opacity-50"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-white/50">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && !rows.length && (
          <p className="text-muted-foreground text-sm mt-4">No users found.</p>
        )}
      </div>
    </div>
  );
         }
        
