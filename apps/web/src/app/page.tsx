import { Hero } from '@/components/home/hero';
import { ProductRail } from '@/components/home/product-rail';
import { CategoriesGrid } from '@/components/home/categories-grid';
import { WhyUs } from '@/components/home/why-us';
import { Reviews } from '@/components/home/reviews';
import { InstagramGallery } from '@/components/home/instagram-gallery';
import { serverFetch } from '@/lib/server-api';
import type { Category, Product } from '@/types';

export default async function HomePage() {
  const [home, categories] = await Promise.all([
    serverFetch<{
      featured: Product[];
      newArrivals: Product[];
      trending: Product[];
      bestSellers: Product[];
    }>('/products/home'),
    serverFetch<Category[]>('/categories'),
  ]);

  return (
    <>
      <Hero />
      <CategoriesGrid categories={categories || []} />
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
          <a
            href="/accessories"
            className="btn-primary relative mt-8 inline-flex"
          >
            Shop Accessories
          </a>
        </div>
      </section>
    </>
  );
}
