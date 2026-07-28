import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'FAQ' };

const faqs = [
  {
    q: 'What is VYQOUR?',
    a: 'VYQOUR is an India-based fashion label founded by three partners. We design original, in-house graphics and produce each piece as a made-to-order item — not mass-manufactured stock.',
  },
  {
    q: 'Are your designs original?',
    a: 'Yes. Every design is created specifically for VYQOUR. We do not reprint or resell third-party artwork.',
  },
  {
    q: 'What does "made to order" mean for delivery time?',
    a: 'Since your item is produced after you order, please allow 2–4 business days for production and dispatch, plus 3–7 business days for delivery — typically 5–10 business days in total.',
  },
  {
    q: 'Do you offer Cash on Delivery (COD)?',
    a: 'Yes, COD is available on eligible orders and pin codes. You can also pay online via UPI, cards, or netbanking through Razorpay.',
  },
  {
    q: 'Is it safe to pay online on VYQOUR?',
    a: 'Yes. All online payments are processed securely through Razorpay. We never see or store your card, UPI, or bank details.',
  },
  {
    q: 'When is shipping free?',
    a: 'Orders of ₹1,999 and above ship free anywhere in India. Below that, a flat ₹99 shipping fee applies, shown clearly at checkout.',
  },
  {
    q: 'How do I track my order?',
    a: 'Use the Track Order page with your order number, or check Account → Orders if you are logged in.',
  },
  {
    q: 'Can I return an item if I don\u2019t like the fit?',
    a: 'Since each item is custom made for your order, we are unable to accept returns for size preference or change of mind. Please check the size guide on each product page before ordering.',
  },
  {
    q: 'What if my item arrives damaged, defective, or wrong?',
    a: 'Contact us within 7 days of delivery with your order number and photos, and we will arrange a free replacement. Full details are on our Refund Policy page.',
  },
  {
    q: 'How do sizes run?',
    a: 'Most tees and hoodies are true-to-size with a modern silhouette. Check the size chart on each product page before ordering, as fit can vary slightly by style.',
  },
  {
    q: 'Can I cancel an order?',
    a: 'Yes — you can cancel from your Orders page before your item enters production/ships. Once production has started, cancellation is no longer possible since the item is made specifically for you.',
  },
  {
    q: 'How do coupons work?',
    a: 'Apply a valid coupon code at cart or checkout to see the discount applied to your order total. One coupon can be used per order unless stated otherwise.',
  },
  {
    q: 'How can I contact VYQOUR?',
    a: 'Email us at vyqourofficial@gmail.com — our small founder-run team personally reads and replies to every message.',
  },
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
