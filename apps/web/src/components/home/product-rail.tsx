import { ProductCard } from '@/components/shared/product-card';
import { SectionHeader } from '@/components/shared/section-header';
import type { Product } from '@/types';

export function ProductRail({
  eyebrow,
  title,
  description,
  href,
  products,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  products: Product[];
}) {
  if (!products?.length) return null;
  return (
    <section className="container-px section-pad">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} href={href} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}
