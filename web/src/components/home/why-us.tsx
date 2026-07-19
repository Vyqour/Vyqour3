import { Shield, Sparkles, Truck, RefreshCcw } from 'lucide-react';
import { SectionHeader } from '@/components/shared/section-header';

const items = [
  {
    icon: Sparkles,
    title: 'Premium GSM',
    body: 'Heavyweight cotton and technical blends chosen for hand-feel and longevity.',
  },
  {
    icon: Truck,
    title: 'India-wide Delivery',
    body: 'Fast shipping across India. Free over ₹1,999. COD available.',
  },
  {
    icon: RefreshCcw,
    title: 'Easy Returns',
    body: 'Hassle-free returns on eligible items. See our refund policy for details.',
  },
  {
    icon: Shield,
    title: 'Secure Checkout',
    body: 'Encrypted payments, verified orders, and real human support.',
  },
];

export function WhyUs() {
  return (
    <section className="container-px section-pad">
      <SectionHeader eyebrow="Why VYQOUR" title="Built different." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="glass-hover rounded-2xl p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-glow">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-medium">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
