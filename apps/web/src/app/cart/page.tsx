'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cart-store';
import { formatInr } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';

export default function CartPage() {
  const { cart, loading, fetchCart, updateItem, removeItem, applyCoupon } = useCartStore();
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchCart().catch(() => undefined);
  }, [fetchCart]);

  if (loading && !cart) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!cart?.items?.length) {
    return (
      <div className="container-px py-16">
        <EmptyState
          title="Your bag is empty"
          description="Discover pieces that feel like you."
          actionLabel="Shop now"
          actionHref="/shop"
        />
      </div>
    );
  }

  return (
    <div className="container-px py-10 md:py-14">
      <h1 className="text-3xl font-medium">Your Bag</h1>
      <p className="mt-1 text-sm text-muted-foreground">{cart.summary.itemCount} items</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {cart.items.map((item) => {
            const img = item.product.images?.[0]?.url;
            return (
              <div key={item.id} className="glass flex gap-4 rounded-2xl p-4">
                <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {img && <Image src={img} alt="" fill className="object-cover" sizes="96px" />}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/product/${item.product.slug}`} className="font-medium hover:text-primary-glow">
                        {item.product.name}
                      </Link>
                      {(item.variant?.size || item.variant?.color) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[item.variant?.color, item.variant?.size].filter(Boolean).join(' / ')}
                        </p>
                      )}
                    </div>
                    <p className="font-medium">{formatInr(item.lineTotal)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="inline-flex items-center rounded-full border border-white/10">
                      <button
                        className="p-2"
                        onClick={() => updateItem(item.id, Math.max(0, item.quantity - 1))}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button className="p-2" onClick={() => updateItem(item.id, item.quantity + 1)}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-red-400"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="glass h-fit rounded-2xl p-6">
          <h2 className="text-lg font-medium">Order Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatInr(cart.summary.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-green-400">-{formatInr(cart.summary.discountAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{cart.summary.shippingAmount === 0 ? 'Free' : formatInr(cart.summary.shippingAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax (est.)</span>
              <span>{formatInr(cart.summary.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatInr(cart.summary.total)}</span>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Input
              placeholder="Coupon code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <Button
              variant="secondary"
              loading={applying}
              onClick={async () => {
                setApplying(true);
                try {
                  await applyCoupon(code);
                  toast.success('Coupon applied');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Invalid coupon');
                } finally {
                  setApplying(false);
                }
              }}
            >
              Apply
            </Button>
          </div>
          {cart.summary.couponCode && (
            <p className="mt-2 text-xs text-primary-glow">Applied: {cart.summary.couponCode}</p>
          )}

          <Button asChild className="mt-6 w-full" size="lg">
            <Link href="/checkout">Checkout</Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Try VYQOUR10 · FREESHIP · IDENTITY500
          </p>
        </aside>
      </div>
    </div>
  );
}
