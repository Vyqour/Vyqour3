import Link from 'next/link';
import { Camera, Mail, MapPin } from 'lucide-react';
import { NewsletterForm } from '@/components/home/newsletter-form';

const shop = [
  { href: '/shop?category=t-shirts', label: 'T-Shirts' },
  { href: '/shop?category=hoodies', label: 'Hoodies' },
  { href: '/shop?category=jackets', label: 'Jackets' },
  { href: '/shop?category=bottom-wear', label: 'Bottom Wear' },
  { href: '/accessories', label: 'Accessories' },
];

const help = [
  { href: '/track-order', label: 'Track Order' },
  { href: '/faq', label: 'FAQ' },
  { href: '/shipping-policy', label: 'Shipping' },
  { href: '/refund', label: 'Returns & Refunds' },
  { href: '/contact', label: 'Contact' },
];

const company = [
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Journal' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-black">
      <div className="container-px section-pad">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" className="text-2xl font-semibold tracking-[0.25em]">
              VYQOUR
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">Wear Your Identity.</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Premium print-on-demand fashion for India&apos;s next generation. Designed with intent.
              Delivered with care.
            </p>
            <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary-glow" /> support@vyqour.com
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary-glow" /> India
              </span>
            </div>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 transition hover:border-primary/50 hover:text-primary-glow"
              aria-label="Instagram"
            >
              <Camera className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">Shop</h4>
              <ul className="space-y-2.5">
                {shop.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">Help</h4>
              <ul className="space-y-2.5">
                {help.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">Company</h4>
              <ul className="space-y-2.5">
                {company.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
              Newsletter
            </h4>
            <p className="mb-4 text-sm text-muted-foreground">
              Drops, early access, and identity notes. No spam.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/5 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VYQOUR. All rights reserved.</p>
          <p>Crafted in India · Prices in INR (₹)</p>
        </div>
      </div>
    </footer>
  );
}
