'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Heart, Minus, Plus, Share2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types';
import { discountPercent, formatInr } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAuthStore } from '@/store/auth-store';

export function ProductDetail({ product }: { product: Product }) {
  const images = product.images?.length ? product.images : [];
  const [activeImg, setActiveImg] = useState(0);
  const sizes = useMemo(
    () => [...new Set(product.variants?.map((v) => v.size).filter(Boolean))] as string[],
    [product.variants],
  );
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    product.variants?.forEach((v) => {
      if (v.color) map.set(v.color, v.colorHex || '#888');
    });
    return [...map.entries()].map(([name, hex]) => ({ name, hex }));
  }, [product.variants]);

  const [size, setSize] = useState(sizes[0] || '');
  const [color, setColor] = useState(colors[0]?.name || '');
  const [qty, setQty] = useState(1);

  const variant = product.variants?.find(
    (v) => (!size || v.size === size) && (!color || v.color === color),
  );
  const price = Number(variant?.price ?? product.basePrice);
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const off = discountPercent(price, compare);

  const addItem = useCartStore((s) => s.addItem);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wished = useWishlistStore((s) => s.ids.has(product.id));
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);

  const add = async () => {
    setLoading(true);
    try {
      await addItem(product.id, qty, variant?.id);
      toast.success('Added to bag');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-px py-10 md:py-14">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/5 bg-muted">
            {images[activeImg] ? (
              <Image
                src={images[activeImg].url}
                alt={images[activeImg].alt || product.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            ) : null}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  className={`relative aspect-square overflow-hidden rounded-xl border ${i === activeImg ? 'border-primary' : 'border-white/10'}`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="100px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {product.category?.name}
          </p>
          <h1 className="mt-2 text-3xl font-medium md:text-4xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold">{formatInr(price)}</span>
            {compare && compare > price && (
              <>
                <span className="text-muted-foreground line-through">{formatInr(compare)}</span>
                <Badge variant="sale">-{off}%</Badge>
              </>
            )}
          </div>
          {product.averageRating > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              ★ {product.averageRating.toFixed(1)} · {product.reviewCount} reviews · {product.totalSold} sold
            </p>
          )}

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {product.shortDescription || product.description}
          </p>

          {colors.length > 0 && (
            <div className="mt-8">
              <p className="label-field">Color — {color}</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.name)}
                    title={c.name}
                    className={`h-9 w-9 rounded-full border-2 ${color === c.name ? 'border-white' : 'border-transparent'}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="mt-6">
              <p className="label-field">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`min-w-12 rounded-full border px-4 py-2 text-sm ${
                      size === s
                        ? 'border-primary bg-primary/20 text-white'
                        : 'border-white/10 text-muted-foreground hover:border-white/30'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="label-field">Quantity</p>
            <div className="inline-flex items-center rounded-full border border-white/10">
              <button className="p-3" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm">{qty}</span>
              <button className="p-3" onClick={() => setQty((q) => q + 1)} aria-label="Increase">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {variant && (
              <p className="mt-2 text-xs text-muted-foreground">
                {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="min-w-[180px]" loading={loading} onClick={add} disabled={variant?.stock === 0}>
              Add to Bag
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={async () => {
                if (!user) return toast.message('Sign in to use wishlist');
                try {
                  const on = await toggleWish(product.id);
                  toast.success(on ? 'Saved' : 'Removed');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Error');
                }
              }}
            >
              <Heart className={`h-4 w-4 ${wished ? 'fill-red-400 text-red-400' : ''}`} /> Wishlist
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.share?.({ title: product.name, url: window.location.href });
                } catch {
                  await navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied');
                }
              }}
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>

          <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 text-white">
              <Truck className="h-4 w-4 text-primary-glow" /> Free shipping over ₹499 · COD available
            </p>
            <p>Dispatch in 2–4 business days. Easy returns on eligible items.</p>
            {product.materials && <p>Materials: {product.materials}</p>}
            {product.careInstructions && <p>Care: {product.careInstructions}</p>}
          </div>

          <div className="prose-invert-custom mt-10">
            <h2 className="text-lg">Description</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
