'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api';
import type { Product } from '@/types';

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
}

interface WishlistState {
  items: WishlistItem[];
  ids: Set<string>;
  fetch: () => Promise<void>;
  toggle: (productId: string) => Promise<boolean>;
  has: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  ids: new Set(),
  fetch: async () => {
    try {
      const items = await apiClient.get<WishlistItem[]>('/wishlist', { auth: true });
      set({ items, ids: new Set(items.map((i) => i.productId)) });
    } catch {
      set({ items: [], ids: new Set() });
    }
  },
  toggle: async (productId) => {
    const res = await apiClient.post<{ inWishlist: boolean }>(
      `/wishlist/${productId}/toggle`,
      {},
      { auth: true },
    );
    const ids = new Set(get().ids);
    if (res.inWishlist) ids.add(productId);
    else ids.delete(productId);
    set({ ids });
    await get().fetch();
    return res.inWishlist;
  },
  has: (productId) => get().ids.has(productId),
}));
