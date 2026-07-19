'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';

const nav = [
  { href: '/shop', label: 'Shop' },
  { href: '/collections', label: 'Collections' },
  { href: '/accessories', label: 'Accessories' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Journal' },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const cart = useCartStore((s) => s.cart);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const user = useAuthStore((s) => s.user);
  const count = cart?.summary?.itemCount || 0;

  useEffect(() => {
    fetchCart().catch(() => undefined);
  }, [fetchCart]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled || open
          ? 'border-b border-white/5 bg-background/80 backdrop-blur-xl'
          : 'bg-transparent',
      )}
    >
      <div className="container-px flex h-16 items-center justify-between gap-4 md:h-20">
        <button
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-[0.25em]">VYQOUR</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm text-muted-foreground transition hover:text-white',
                pathname.startsWith(item.href) && 'text-white',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            className="btn-ghost h-10 w-10 p-0"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-5 w-5" />
          </button>
          <Link href="/wishlist" className="btn-ghost hidden h-10 w-10 p-0 sm:inline-flex" aria-label="Wishlist">
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href={user ? '/account' : '/login'}
            className="btn-ghost h-10 w-10 p-0"
            aria-label="Account"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="btn-ghost relative h-10 w-10 p-0" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-white/5 bg-background/95 px-4 py-3 backdrop-blur-xl">
          <form
            className="container-px flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) window.location.href = `/shop?search=${encodeURIComponent(q.trim())}`;
            }}
          >
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tees, hoodies, accessories..."
              className="input-field"
            />
            <Button type="submit">Search</Button>
          </form>
        </div>
      )}

      {open && (
        <div className="border-t border-white/5 bg-background/95 px-4 py-6 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-4">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="text-lg text-white">
                {item.label}
              </Link>
            ))}
            <Link href="/contact" className="text-lg text-muted-foreground">
              Contact
            </Link>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground"
            >
              <Camera className="h-4 w-4" /> Instagram
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
