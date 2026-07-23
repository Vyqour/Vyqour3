import Image from 'next/image';
import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import { resolveCategoryImage } from '@/lib/category-image';
import type { Collection, Paginated, Product } from '@/types';
import { ProductRail } from '@/components/home/product-rail';

export const metadata = { title: 'Collections' };

export default async function CollectionsPage() {
  const collections =
    (await serverFetch<Collection[]>('/collections')) || [];
  const active = (collections || []).filter((c) => c.isActive !== false);

  // Fallback cards if API empty (e.g. seed not run yet)
  const cards =
    active.length > 0
      ? active
      : [
          {
            id: 'clothes',
            name: 'Clothes',
            slug: 'clothes',
            description: 'Apparel essentials — tees, hoodies, layers and more',
            imageUrl: null,
          },
          {
            id: 'accessories',
            name: 'Accessories',
            slug: 'accessories',
            description: 'Caps, totes, phone covers and finishing details',
            imageUrl: null,
          },
        ];

  const productGroups = await Promise.all(
    cards.map(async (c) => {
      const res = await serverFetch<Paginated<Product> | { data: Product[] }>(
        `/products?collection=${c.slug}&limit=8`,
      );
      const products = (res && 'data' in res ? res.data : []) as Product[];
      return { collection: c, products };
    }),
  );

  return (
    <div className="container-px section-pad">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Curated</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Collections</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Shop by collection — Clothes and Accessories, organized for how you dress.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const src = resolveCategoryImage(
            {
              name: c.name,
              slug: c.slug,
              imageUrl: c.featuredImageUrl || c.bannerUrl || c.imageUrl,
            },
            1100,
          );
          return (
            <Link
              key={c.id}
              href={`/shop?collection=${c.slug}`}
              className="group relative min-h-[240px] overflow-hidden rounded-2xl border border-white/10 md:min-h-[320px]"
            >
              <Image
                src={src}
                alt={c.name}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width:768px) 100vw, 50vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-0 p-5 md:p-8">
                <h2 className="text-2xl font-medium text-white md:text-3xl">{c.name}</h2>
                {c.description && (
                  <p className="mt-1 max-w-md text-sm text-white/60 line-clamp-2">{c.description}</p>
                )}
                <span className="mt-3 inline-block text-sm text-primary-glow">Explore →</span>
              </div>
            </Link>
          );
        })}
      </div>

      {productGroups.map(({ collection, products }) =>
        products.length ? (
          <ProductRail
            key={collection.id}
            eyebrow="Collection"
            title={collection.name}
            href={`/shop?collection=${collection.slug}`}
            products={products}
          />
        ) : null,
      )}

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <Link
          href="/shop?featured=true"
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-white/25"
        >
          <h2 className="text-2xl font-medium">Featured Drop</h2>
          <p className="mt-2 text-sm text-muted-foreground">Editor picks from the latest capsule.</p>
          <span className="mt-4 inline-block text-sm text-primary-glow">Explore →</span>
        </Link>
        <Link
          href="/shop?newArrival=true"
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-white/25"
        >
          <h2 className="text-2xl font-medium">New Arrivals</h2>
          <p className="mt-2 text-sm text-muted-foreground">Fresh silhouettes, just landed.</p>
          <span className="mt-4 inline-block text-sm text-primary-glow">Explore →</span>
        </Link>
      </div>
    </div>
  );
}
