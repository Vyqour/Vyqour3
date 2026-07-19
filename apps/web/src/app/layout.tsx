import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { absoluteUrl } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'VYQOUR — Wear Your Identity.',
    template: '%s | VYQOUR',
  },
  description:
    'Premium print-on-demand fashion for India. T-shirts, hoodies, jackets & accessories. Wear Your Identity.',
  keywords: ['VYQOUR', 'streetwear', 'print on demand', 'hoodies India', 'premium tees'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: absoluteUrl('/'),
    siteName: 'VYQOUR',
    title: 'VYQOUR — Wear Your Identity.',
    description: 'Premium print-on-demand fashion for India.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VYQOUR — Wear Your Identity.',
    description: 'Premium print-on-demand fashion for India.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: absoluteUrl('/') },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
