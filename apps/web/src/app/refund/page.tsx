import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Refund Policy' };

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Refund Policy</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">

        <p>Last updated: July 2026</p>
        <p>
          Every VYQOUR item is an original design, made to order specifically for your purchase. This
          policy explains what happens if something goes wrong with your order, and how we handle
          returns, replacements, and undelivered shipments.
        </p>

        <h2 className="text-white text-lg font-medium">1. Why we don&apos;t accept general returns</h2>
        <p>
          Because each item is custom-produced for your order rather than picked from ready stock, we
          are unable to accept returns for reasons such as change of mind, incorrect size selected by
          you, or general dissatisfaction with style or fit. We encourage you to check the size guide
          on each product page carefully before ordering.
        </p>

        <h2 className="text-white text-lg font-medium">2. When you are eligible for a replacement</h2>
        <p>We will replace your item at no extra cost if it arrives:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-white">Damaged</strong> — visibly damaged in transit or the packaging.</li>
          <li><strong className="text-white">Defective</strong> — a print, stitching, or manufacturing defect not caused by wear and tear.</li>
          <li><strong className="text-white">Incorrect</strong> — a different design, size, or product than what you ordered.</li>
        </ul>

        <h2 className="text-white text-lg font-medium">3. How to request a replacement</h2>
        <p>
          Contact us within <strong className="text-white">7 days of delivery</strong> at{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>{' '}
          with your order number, a brief description of the issue, and clear photos of the item
          showing the damage, defect, or discrepancy (including the label/tag where relevant).
          Requests raised after 7 days from delivery, or without supporting photos, may not be
          eligible.
        </p>

        <h2 className="text-white text-lg font-medium">4. What happens next</h2>
        <p>
          We review every request personally. Once approved, we arrange a replacement of the same
          item at no additional cost to you — production and dispatch of the replacement follow the
          same timelines described in our{' '}
          <a href="/shipping-policy" className="text-primary-glow underline">Shipping Policy</a>. Where
          needed, we may ask you to share the original item&apos;s packaging photos or arrange a
          reverse pickup before dispatching the replacement.
        </p>

        <h2 className="text-white text-lg font-medium">5. Undelivered or refused orders (RTO)</h2>
        <p>
          Occasionally a shipment is returned to us because it could not be delivered — for example,
          the address was incomplete or incorrect, the courier could not reach you after repeated
          attempts, or delivery was refused at the doorstep. These are called RTO (Return to Origin)
          orders. In such cases:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>We will contact you to confirm a corrected address and reattempt delivery, where possible, at an additional shipping charge.</li>
          <li>If you are unreachable or decline redelivery, the order value (excluding original shipping charges) may be refunded to your original payment method, or held as store credit, at our discretion.</li>
          <li>Repeated RTO due to refused delivery or unreachable contact details may affect eligibility for COD on future orders.</li>
        </ul>

        <h2 className="text-white text-lg font-medium">6. Refunds</h2>
        <p>
          As our policy is replacement-based for eligible issues, we do not offer monetary refunds
          except where a replacement is not possible — for example, if the design or size is no
          longer available, or in confirmed RTO cases as described above. In such cases, the refund is
          issued to your original payment method via Razorpay within 5–10 business days, or via
          UPI/bank transfer if you paid via Cash on Delivery.
        </p>

        <h2 className="text-white text-lg font-medium">7. Order cancellations</h2>
        <p>
          You may cancel an order before it enters production or ships, from your Account → Orders
          page, or by contacting us. Once production has begun or the order has shipped, it can no
          longer be cancelled since the item is made specifically for you.
        </p>

        <h2 className="text-white text-lg font-medium">8. Contact us</h2>
        <p>
          For any replacement, RTO, or order issue, write to us at{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>{' '}
          with your order number — our team personally reviews and responds to every request.
        </p>

      </div>
    </div>
  );
          }
