import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Shipping Policy' };

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Shipping Policy</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        
        <p>We ship across India. Standard dispatch is 2–4 business days. Delivery typically takes 3–7 business days depending on location.</p>
        <h2 className="text-white text-lg font-medium">Shipping fees</h2>
        <p>Flat rate ₹99. Free shipping on orders ₹1,999 and above. Remote areas may require additional time.</p>
        <h2 className="text-white text-lg font-medium">Tracking</h2>
        <p>Tracking details are emailed when your order ships. You can also use Track Order on the site.</p>

      </div>
    </div>
  );
}
