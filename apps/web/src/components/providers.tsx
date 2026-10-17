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
    // Always attempt session validation/restoration if tokens or a user state exist
    const token = typeof window !== 'undefined' ? localStorage.getItem('vyqour_access') : null;
    const refresh = typeof window !== 'undefined' ? localStorage.getItem('vyqour_refresh') : null;

    if (token || refresh || user) {
      fetchMe().then((u) => {
        if (u) fetchWish().catch(() => undefined);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

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
