'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { ProductCard } from '@/components/shared/product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';

export default function WishlistPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const { items, fetch } = useWishlistStore();

  useEffect(() => {
    if (hydrated && !user) router.push('/login');
    if (user) fetch();
  }, [user, hydrated, router, fetch]);

  if (!hydrated || !user) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container-px py-10 md:py-14">
      <h1 className="text-3xl font-medium">Wishlist</h1>
      {!items.length ? (
        <div className="mt-10">
          <EmptyState title="Nothing saved yet" actionLabel="Discover pieces" actionHref="/shop" />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((i, idx) => (
            <ProductCard key={i.id} product={i.product} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
