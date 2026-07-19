import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms & Conditions' };

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Terms & Conditions</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        
        <p>By using VYQOUR you agree to these terms. Products are sold for personal use. Prices are in INR and include applicable taxes unless stated otherwise.</p>
        <h2 className="text-white text-lg font-medium">Orders</h2>
        <p>Placing an order constitutes an offer to purchase. We may cancel orders for stock, pricing, or fraud issues and will notify you.</p>
        <h2 className="text-white text-lg font-medium">Intellectual property</h2>
        <p>All VYQOUR marks, designs, and content are owned by us or licensed to us. Unauthorized use is prohibited.</p>

      </div>
    </div>
  );
}
