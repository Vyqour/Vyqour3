import Image from 'next/image';
import Link from 'next/link';
import { SectionHeader } from '@/components/shared/section-header';
import { resolveCategoryImage } from '@/lib/category-image';
import type { Category } from '@/types';

export function CategoriesGrid({ categories }: { categories: Category[] }) {
  const roots = (categories || []).filter((c) => !c.parentId).slice(0, 7);
  if (!roots.length) return null;

  return (
    <section className="container-px section-pad">
      <SectionHeader
        eyebrow="Browse"
        title="Featured Categories"
        description="Find your silhouette."
        href="/shop"
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
        {roots.map((c, i) => {
          const src = resolveCategoryImage(c, i === 0 ? 1200 : 800);
          return (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className={`group relative overflow-hidden rounded-2xl border border-white/5 ${
                i === 0 ? 'md:col-span-2 md:row-span-2 min-h-[280px]' : 'min-h-[160px]'
              }`}
            >
              <Image
                src={src}
                alt={c.name}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width:768px) 50vw, 25vw"
                priority={i === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-4 md:p-6">
                <h3 className="text-lg font-medium md:text-xl">{c.name}</h3>
                {c._count && (
                  <p className="text-xs text-muted-foreground">{c._count.products} pieces</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
