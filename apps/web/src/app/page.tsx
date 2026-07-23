import { Hero } from '@/components/home/hero';
import { ProductRail } from '@/components/home/product-rail';
import { CategoriesGrid } from '@/components/home/categories-grid';
import { WhyUs } from '@/components/home/why-us';
import { Reviews } from '@/components/home/reviews';
import { InstagramGallery } from '@/components/home/instagram-gallery';
import { serverFetch } from '@/lib/server-api';
import type { Category, Collection, Product } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { resolveCategoryImage } from '@/lib/category-image';
import { SectionHeader } from '@/components/shared/section-header';

export default async function HomePage() {
  const [home, categories, featuredCollections] = await Promise.all([
    serverFetch<{
      featured: Product[];
      newArrivals: Product[];
      trending: Product[];
      bestSellers: Product[];
    }>('/products/home'),
    serverFetch<Category[]>('/categories'),
    serverFetch<Collection[]>('/collections?featured=true'),
  ]);

  const collections = featuredCollections || [];

  return (
    <>
      <Hero />
      <CategoriesGrid categories={categories || []} />
      {collections.length > 0 && (
        <section className="container-px section-pad pt-0">
          <SectionHeader
            eyebrow="Collections"
            title="Featured Collections"
            description="Curated drops and identity packs."
            href="/collections"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => {
              const src = resolveCategoryImage(
                {
                  name: c.name,
                  slug: c.slug,
                  imageUrl: c.featuredImageUrl || c.bannerUrl || c.imageUrl,
                },
                900,
              );
              return (
                <Link
                  key={c.id}
                  href={`/shop?collection=${c.slug}`}
                  className="group relative min-h-[200px] overflow-hidden rounded-2xl border border-white/10"
                >
                  <Image
                    src={src}
                    alt={c.name}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute bottom-0 p-5">
                    <h3 className="text-lg font-medium">{c.name}</h3>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <ProductRail
        eyebrow="Curated"
        title="Featured Collection"
        href="/shop?featured=true"
        products={home?.featured || []}
      />
      <ProductRail
        eyebrow="Just dropped"
        title="New Arrivals"
        href="/shop?newArrival=true"
        products={home?.newArrivals || []}
      />
      <ProductRail
        eyebrow="Heat"
        title="Trending Now"
        href="/shop?trending=true"
        products={home?.trending || []}
      />
      <ProductRail
        eyebrow="Most loved"
        title="Best Sellers"
        href="/shop?bestSeller=true"
        products={home?.bestSellers || []}
      />
      <WhyUs />
      <Reviews />
      <InstagramGallery />
      <section className="container-px pb-24">
        <div className="glass relative overflow-hidden rounded-3xl px-8 py-14 text-center md:px-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-primary-glow">
            Accessories
          </p>
          <h2 className="relative mt-3 text-3xl font-medium md:text-4xl">Finish the look</h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Caps, totes, phone covers, dog tags — details that complete the identity.
          </p>
          <a href="/accessories" className="btn-primary relative mt-8 inline-flex">
            Shop Accessories
          </a>
        </div>
      </section>
    </>
  );
}
