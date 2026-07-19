'use client';

import { create } from 'zustand';
import type { Cart } from '@/types';
import { apiClient } from '@/lib/api';

interface CartState {
  cart: Cart | null;
  loading: boolean;
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
  fetchCart: async () => {
    set({ loading: true });
    try {
      const cart = await apiClient.get<Cart>('/cart', { session: true });
      set({ cart });
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
