import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import type { Category } from '@/types';

export const metadata = { title: 'Collections' };

export default async function CollectionsPage() {
  const categories = (await serverFetch<Category[]>('/categories')) || [];
  const roots = categories.filter((c) => !c.parentId);

  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Curated</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Collections</h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roots.map((c) => (
          <Link key={c.id} href={`/shop?category=${c.slug}`} className="glass-hover rounded-2xl p-8">
            <h2 className="text-xl font-medium">{c.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-4 text-xs text-primary-glow">Explore →</p>
          </Link>
        ))}
        <Link href="/shop?featured=true" className="glass-hover rounded-2xl p-8">
          <h2 className="text-xl font-medium">Featured Drop</h2>
          <p className="mt-2 text-sm text-muted-foreground">Editor picks from the latest capsule.</p>
          <p className="mt-4 text-xs text-primary-glow">Explore →</p>
        </Link>
        <Link href="/shop?newArrival=true" className="glass-hover rounded-2xl p-8">
          <h2 className="text-xl font-medium">New Arrivals</h2>
          <p className="mt-2 text-sm text-muted-foreground">Fresh silhouettes, just landed.</p>
          <p className="mt-4 text-xs text-primary-glow">Explore →</p>
        </Link>
      </div>
    </div>
  );
}
