'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { apiClient, clearTokens, setTokens } from '@/lib/api';

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  setHydrated: (v: boolean) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<User | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      setHydrated: (hydrated) => set({ hydrated }),
      login: async (email, password) => {
        const raw = await apiClient.post<
          | {
              user: User;
              accessToken: string;
              refreshToken: string;
            }
          | {
              data?: {
                user: User;
                accessToken: string;
                refreshToken: string;
              };
              user?: User;
              accessToken?: string;
              refreshToken?: string;
            }
        >('/auth/login', { email: email.trim().toLowerCase(), password });
        const res =
          raw && typeof raw === 'object' && 'data' in raw && raw.data && 'accessToken' in raw.data
            ? raw.data
            : (raw as { user: User; accessToken: string; refreshToken: string });
        if (!res?.accessToken || !res?.user) {
          throw new Error('Login succeeded but tokens were missing from the response');
        }
        setTokens(res.accessToken, res.refreshToken);
        set({ user: res.user });
        // Merge guest session cart into the authenticated user cart
        try {
          const sid =
            typeof window !== 'undefined' ? localStorage.getItem('vyqour_sid') : null;
          if (sid) {
            await apiClient.post('/cart/merge', {}, { auth: true, session: true });
          }
        } catch {
          /* guest cart merge is best-effort */
        }
        return res.user;
      },
      register: async (data) => {
        const payload = {
          ...data,
          email: data.email.trim().toLowerCase(),
          firstName: data.firstName.trim(),
          lastName: data.lastName?.trim() || undefined,
          phone: data.phone?.trim() || undefined,
        };
        const raw = await apiClient.post<
          | {
              user: User;
              accessToken: string;
              refreshToken: string;
            }
          | {
              data?: {
                user: User;
                accessToken: string;
                refreshToken: string;
              };
            }
        >('/auth/register', payload);
        const res =
          raw && typeof raw === 'object' && 'data' in raw && raw.data && 'accessToken' in raw.data
            ? raw.data
            : (raw as { user: User; accessToken: string; refreshToken: string });
        if (!res?.accessToken || !res?.user) {
          throw new Error('Registration succeeded but tokens were missing from the response');
        }
        setTokens(res.accessToken, res.refreshToken);
        set({ user: res.user });
        try {
          const sid =
            typeof window !== 'undefined' ? localStorage.getItem('vyqour_sid') : null;
          if (sid) {
            await apiClient.post('/cart/merge', {}, { auth: true, session: true });
          }
        } catch {
          /* guest cart merge is best-effort */
        }
        return res.user;
      },
      logout: async () => {
        try {
          await apiClient.post('/auth/logout', {});
        } catch {
          /* ignore */
        }
        clearTokens();
        set({ user: null });
      },
      fetchMe: async () => {
        try {
          const user = await apiClient.get<User>('/auth/me', { auth: true });
          set({ user });
          return user;
        } catch {
          clearTokens();
          set({ user: null });
          return null;
        }
      },
    }),
    {
      name: 'vyqour-auth',
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
