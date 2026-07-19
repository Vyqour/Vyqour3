import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'FAQ' };

const faqs = [
  { q: 'What is VYQOUR?', a: 'A premium print-on-demand fashion brand for India. Wear Your Identity.' },
  { q: 'Do you offer COD?', a: 'Yes. Cash on Delivery is available on eligible orders.' },
  { q: 'When is shipping free?', a: 'Orders ₹1,999 and above ship free within India.' },
  { q: 'How do I track my order?', a: 'Use Track Order with your order number, or check Account → Orders.' },
  { q: 'What is your return window?', a: '7 days from delivery for eligible unused items.' },
  { q: 'How do sizes run?', a: 'Most tees are true-to-size with a modern silhouette. Check each product page for size guidance.' },
  { q: 'Can I cancel an order?', a: 'Yes, before it ships — from your order details or by contacting support.' },
  { q: 'How do coupons work?', a: 'Apply codes like VYQOUR10 at cart/checkout. One coupon per order unless stated.' },
];

export default function FaqPage() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Help</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">FAQ</h1>
      <div className="mt-10 max-w-3xl space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="glass group rounded-2xl p-5">
            <summary className="cursor-pointer list-none font-medium marker:content-none">
              {f.q}
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
