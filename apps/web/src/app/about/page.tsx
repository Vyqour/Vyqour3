import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About',
  description:
    'VYQOUR is an India-based custom fashion label creating original, made-to-order designs. Wear Your Identity.',
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
            VYQOUR is an India-based fashion label built by three founders who believe clothing
            should say something true about the person wearing it. We are not a mass-produced
            catalogue brand — every design in our collection is created in-house, specifically for
            VYQOUR, and made to order once you place it.
          </p>
          <p>
            We started VYQOUR because we were tired of picking between &quot;cheap and forgettable&quot;
            and &quot;expensive and impersonal.&quot; We wanted pieces with real intent behind them —
            considered graphics, fabrics that hold their shape, and fits that work for how India&apos;s
            16–30 generation actually dresses.
          </p>
          <p>
            Every VYQOUR piece begins as an original design brief from our team. We work with a
            trusted manufacturing and printing partner to bring each design to life on quality
            fabric, then ship it directly to you, made specifically for your order rather than
            pulled off a shelf.
          </p>
          <p>
            We are a small, founder-run team — not a registered company yet, but a real business
            run by three people who personally read every order, every message, and every piece of
            feedback that comes in. If something goes wrong, you are talking to the people who
            actually make the decisions, not a support ticket queue.
          </p>
          <h2 className="text-lg font-medium text-white">What we stand for</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Original designs — not templates, not reprints of someone else&apos;s work.</li>
            <li>Honest quality — GSM, stitching, and print durability we would wear ourselves.</li>
            <li>Straightforward policies — clear shipping, clear returns, no fine-print surprises.</li>
            <li>Direct support — real replies from the people running VYQOUR, not a bot.</li>
          </ul>
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
