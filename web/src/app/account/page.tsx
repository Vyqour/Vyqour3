'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  MapPin,
  Package,
  Heart,
  Settings,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';

const links = [
  { href: '/account/orders', label: 'Orders', icon: Package, desc: 'Track and review purchases' },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin, desc: 'Shipping destinations' },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart, desc: 'Saved pieces' },
  { href: '/account/settings', label: 'Settings', icon: Settings, desc: 'Profile & security' },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useAuthStore();

  useEffect(() => {
    if (hydrated && !user) router.push('/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container-px py-10 md:py-14">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Account</p>
          <h1 className="mt-2 text-3xl font-medium">
            Hey, {user.firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role !== 'CUSTOMER' && (
            <Button asChild variant="secondary">
              <Link href="/admin">
                <LayoutDashboard className="h-4 w-4" /> Admin
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              await logout();
              router.push('/');
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href} className="glass-hover rounded-2xl p-6">
            <Icon className="h-5 w-5 text-primary-glow" />
            <h2 className="mt-4 font-medium">{label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
