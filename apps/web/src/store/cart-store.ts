'use client';

import { create } from 'zustand';
import type { Cart } from '@/types';
import { apiClient } from '@/lib/api';

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,
  error: null,
  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      const cart = await apiClient.get<Cart>('/cart', { session: true });
      set({ cart, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load your bag' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  addItem: async (productId, quantity = 1, variantId) => {
    const cart = await apiClient.post<Cart>(
      '/cart/items',
      { productId, quantity, variantId },
      { session: true },
    );
    set({ cart });
  },
  updateItem: async (itemId, quantity) => {
    const cart = await apiClient.patch<Cart>(
      `/cart/items/${itemId}`,
      { quantity },
      { session: true },
    );
    set({ cart });
  },
  removeItem: async (itemId) => {
    const cart = await apiClient.delete<Cart>(`/cart/items/${itemId}`, { session: true });
    set({ cart });
  },
  applyCoupon: async (code) => {
    const cart = await apiClient.post<Cart>('/cart/coupon', { code }, { session: true });
    set({ cart });
  },
  clear: async () => {
    const cart = await apiClient.delete<Cart>('/cart', { session: true });
    set({ cart });
  },
}));
