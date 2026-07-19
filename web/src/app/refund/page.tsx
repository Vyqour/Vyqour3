import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Refund Policy' };

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Refund Policy</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        
        <p>We want you to love your pieces. Eligible unused items with original tags may be returned within 7 days of delivery.</p>
        <h2 className="text-white text-lg font-medium">Non-returnable</h2>
        <p>Personalized items, intimate apparel, and final-sale drops are non-returnable unless defective.</p>
        <h2 className="text-white text-lg font-medium">Refunds</h2>
        <p>Approved refunds are issued to the original payment method within 5–10 business days. COD refunds are processed via UPI/bank transfer.</p>

      </div>
    </div>
  );
}
