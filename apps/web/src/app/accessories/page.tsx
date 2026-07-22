import Image from 'next/image';
import Link from 'next/link';
import { ProductRail } from '@/components/home/product-rail';
import { serverFetch } from '@/lib/server-api';
import { resolveCategoryImage } from '@/lib/category-image';
import type { Category, Paginated, Product } from '@/types';

export const metadata = {
  title: 'Accessories',
  description: 'Caps, totes, phone covers, mugs, stickers, posters and more from VYQOUR.',
};

export default async function AccessoriesPage() {
  const categories = (await serverFetch<Category[]>('/categories')) || [];
  const accessoriesRoot = (categories || []).find((c) => c.slug === 'accessories');
  const children =
    accessoriesRoot?.children?.filter((c) => c.isActive !== false) ||
    (categories || []).filter((c) => c.parentId && c.isActive !== false);

  // Prefer known accessory subcategories with images even if API tree is flat
  const fallbackSubs = [
    'Caps',
    'Tote Bags',
    'Phone Covers',
    'Mugs',
    'Stickers',
    'Posters',
    'Drinkware',
  ].map((name, i) => ({
    id: `fallback-${i}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    imageUrl: null as string | null,
    parentId: accessoriesRoot?.id || null,
  }));

  const subs = children.length ? children : fallbackSubs;

  const groups = await Promise.all(
    subs.map(async (sub) => {
      const res = await serverFetch<Paginated<Product> | { data: Product[] }>(
        `/products?category=${sub.slug}&limit=12`,
      );
      const products = (res && 'data' in res ? res.data : []) as Product[];
      return { sub, products };
    }),
  );

  // All accessories fallback rail
  const allRes = await serverFetch<Paginated<Product> | { data: Product[] }>(
    '/products?category=accessories&limit=24',
  );
  const allProducts = (allRes && 'data' in allRes ? allRes.data : []) as Product[];

  return (
    <div>
      <div className="container-px pt-10 md:pt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Details</p>
        <h1 className="mt-2 text-3xl font-medium md:text-4xl">Accessories</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Caps, tote bags, drinkware, phone covers, mugs, stickers, posters — finish the look.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {subs.map((c) => {
            const src = resolveCategoryImage(c, 700);
            return (
              <Link
                key={c.id}
                href={`/shop?category=${c.slug}`}
                className="group relative min-h-[140px] overflow-hidden rounded-2xl border border-white/10 md:min-h-[160px]"
              >
                <Image
                  src={src}
                  alt={c.name}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                  sizes="(max-width:768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute bottom-0 p-3 md:p-4">
                  <h2 className="text-sm font-medium text-white md:text-base">{c.name}</h2>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {groups.map(({ sub, products }) =>
        products.length ? (
          <ProductRail
            key={sub.id}
            title={sub.name}
            products={products}
            href={`/shop?category=${sub.slug}`}
          />
        ) : null,
      )}

      {!groups.some((g) => g.products.length) && allProducts.length > 0 && (
        <ProductRail
          title="All accessories"
          products={allProducts}
          href="/shop?category=accessories"
        />
      )}
    </div>
  );
}
