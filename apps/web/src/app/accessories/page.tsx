import { ProductRail } from '@/components/home/product-rail';
import { serverFetch } from '@/lib/server-api';
import type { Paginated, Product } from '@/types';

export const metadata = {
  title: 'Accessories',
  description: 'Caps, totes, phone covers, dog tags and more from VYQOUR.',
};

export default async function AccessoriesPage() {
  const res = await serverFetch<Paginated<Product> | { data: Product[] }>(
    '/products?category=accessories&limit=24',
  );
  const products = (res && 'data' in res ? res.data : []) as Product[];

  return (
    <div>
      <div className="container-px pt-10 md:pt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Details</p>
        <h1 className="mt-2 text-3xl font-medium md:text-4xl">Accessories</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Caps, tote bags, drinkware, phone covers, dog tags, stickers, stoles — finish the look.
        </p>
      </div>
      <ProductRail title="All accessories" products={products} href="/shop?category=accessories" />
    </div>
  );
}
