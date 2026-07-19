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
        const res = await apiClient.post<{
          user: User;
          accessToken: string;
          refreshToken: string;
        }>('/auth/login', { email, password });
        setTokens(res.accessToken, res.refreshToken);
        set({ user: res.user });
        return res.user;
      },
      register: async (data) => {
        const res = await apiClient.post<{
          user: User;
          accessToken: string;
          refreshToken: string;
        }>('/auth/register', data);
        setTokens(res.accessToken, res.refreshToken);
        set({ user: res.user });
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
