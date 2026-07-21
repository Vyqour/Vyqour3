import Image from 'next/image';
import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import { resolveCategoryImage } from '@/lib/category-image';
import type { Category } from '@/types';

export const metadata = { title: 'Collections' };

export default async function CollectionsPage() {
  const categories = (await serverFetch<Category[]>('/categories')) || [];
  const roots = (categories || []).filter((c) => !c.parentId);

  return (
    <div className="container-px section-pad">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Curated</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Collections</h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roots.map((c) => {
          const src = resolveCategoryImage(c, 900);
          return (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className="group relative min-h-[220px] overflow-hidden rounded-2xl border border-white/10"
            >
              <Image
                src={src}
                alt={c.name}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width:768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-0 p-5">
                <h2 className="text-xl font-medium text-white">{c.name}</h2>
                {c.description && (
                  <p className="mt-1 text-sm text-white/60 line-clamp-2">{c.description}</p>
                )}
                <span className="mt-3 inline-block text-sm text-primary-glow">Explore →</span>
              </div>
            </Link>
          );
        })}
      </div>

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
