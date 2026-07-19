'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { useWishlistStore } from '@/store/wishlist-store';

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const fetchWish = useWishlistStore((s) => s.fetch);

  useEffect(() => {
    if (!hydrated) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('vyqour_access') : null;
    if (token) {
      fetchMe().then((u) => {
        if (u) fetchWish().catch(() => undefined);
      });
    }
  }, [hydrated, fetchMe, fetchWish]);

  useEffect(() => {
    if (user) fetchWish().catch(() => undefined);
  }, [user, fetchWish]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <AuthBootstrap>{children}</AuthBootstrap>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: '#121212',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  );
}
