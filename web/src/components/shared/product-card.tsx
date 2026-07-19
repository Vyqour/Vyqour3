'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { Product } from '@/types';
import { cn, discountPercent, formatInr } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAuthStore } from '@/store/auth-store';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const price = Number(product.basePrice);
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const off = discountPercent(price, compare);
  const img = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url;
  const addItem = useCartStore((s) => s.addItem);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const hasWish = useWishlistStore((s) => s.ids.has(product.id));
  const user = useAuthStore((s) => s.user);

  const onAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const variant = product.variants?.[0];
      await addItem(product.id, 1, variant?.id);
      toast.success('Added to bag');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add to bag');
    }
  };

  const onWish = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.message('Sign in to save wishlist items');
      return;
    }
    try {
      const on = await toggleWish(product.id);
      toast.success(on ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wishlist error');
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/5 bg-muted">
          {img ? (
            <Image
              src={img}
              alt={product.name}
              fill
              sizes="(max-width:768px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">VYQOUR</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {off > 0 && <Badge variant="sale">-{off}%</Badge>}
            {product.isNewArrival && <Badge>New</Badge>}
            {product.isBestSeller && <Badge variant="secondary">Best</Badge>}
          </div>
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all">
            <button
              onClick={onWish}
              aria-label="Wishlist"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur transition hover:border-primary/50',
                hasWish && 'text-red-400',
              )}
            >
              <Heart className={cn('h-4 w-4', hasWish && 'fill-current')} />
            </button>
            <button
              onClick={onAdd}
              aria-label="Add to bag"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur transition hover:border-primary/50 hover:bg-primary"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-1 px-0.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {product.category?.name}
          </p>
          <h3 className="line-clamp-1 text-sm font-medium text-white group-hover:text-primary-glow transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{formatInr(price)}</span>
            {compare && compare > price && (
              <span className="text-xs text-muted-foreground line-through">{formatInr(compare)}</span>
            )}
          </div>
          {product.averageRating > 0 && (
            <p className="text-xs text-muted-foreground">
              ★ {product.averageRating.toFixed(1)} · {product.reviewCount} reviews
            </p>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
