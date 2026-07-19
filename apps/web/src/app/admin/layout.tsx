'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/qikink', label: 'Qikink' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/media', label: 'Media' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace('/login');
    else if (!['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(user.role)) router.replace('/account');
  }, [user, hydrated, router]);

  if (!hydrated || !user || !['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(user.role)) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container-px py-8 md:py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Admin</p>
          <h1 className="mt-1 text-2xl font-medium">VYQOUR Console</h1>
        </div>
        <Link href="/" className="text-sm text-muted-foreground hover:text-white">
          ← Storefront
        </Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm whitespace-nowrap',
                pathname === l.href ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-white/5 hover:text-white',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
