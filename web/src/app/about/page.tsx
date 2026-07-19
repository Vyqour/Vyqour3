import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About',
  description: 'VYQOUR is premium print-on-demand fashion for India. Wear Your Identity.',
};

export default function AboutPage() {
  return (
    <div className="container-px py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Brand</p>
        <h1 className="mt-2 text-4xl font-medium tracking-tight md:text-5xl">
          Wear Your Identity.
        </h1>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
          <p>
            VYQOUR is a premium print-on-demand fashion house built for India&apos;s 16–30 generation —
            people who treat clothing like a signature, not a costume.
          </p>
          <p>
            We obsess over GSM, drape, and finish. Our capsules stay tight on purpose: less noise, more
            meaning. From heavyweight hoodies to quiet accessories, every piece is designed to feel
            intentional the moment you put it on.
          </p>
          <p>
            Designed with a modern luxury lens — Apple clarity, Nike energy, Nothing minimalism — and
            shipped nationwide with COD and easy support.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/shop">Shop the collection</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
