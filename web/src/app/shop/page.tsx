import { Suspense } from 'react';
import { ShopClient } from './shop-client';
import { Spinner } from '@/components/ui/spinner';

export const metadata = {
  title: 'Shop',
  description: 'Browse VYQOUR premium tees, hoodies, jackets, bottoms and accessories.',
};

export default function ShopPage() {
  return (
    <div className="container-px py-10 md:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Catalog</p>
        <h1 className="mt-2 text-3xl font-medium md:text-4xl">Shop All</h1>
      </div>
      <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
        <ShopClient />
      </Suspense>
    </div>
  );
}
