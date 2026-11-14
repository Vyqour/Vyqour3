import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns, Refunds & Cancellation Policy',
  description: 'VYQOUR policy for order cancellations, returns, replacements and refunds.',
};

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Customer Support</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Returns, Refunds &amp; Cancellation Policy</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>Last updated: November 2026</p>
        <p>
          This policy explains how VYQOUR handles order cancellations, returns, replacements and
          refunds. It applies to purchases made through our website and must be read together with
          the product description and applicable consumer protection law.
        </p>

        <h2 className="text-white text-lg font-medium">1. If something is wrong with your item</h2>
        <p>
          Please contact us if an item is damaged, defective, incorrect, materially different from
          its product description, or otherwise does not meet the order you placed. Depending on
          the circumstances and applicable law, we will arrange an appropriate remedy, which may
          include a replacement, repair, return or refund. We will not refuse a remedy that you are
          legally entitled to receive.
        </p>
        <p>
          Because some VYQOUR products are prepared or produced after an order is placed, we
          generally cannot accept a change-of-mind return or a return solely because a customer
          selected the wrong size or colour. This restriction does not apply where a return or
          refund is required by applicable law or where the product is defective, deficient,
          damaged, incorrect or not as described.
        </p>

        <h2 className="text-white text-lg font-medium">2. How to report a problem</h2>
        <p>
          Please email{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>{' '}
          with your order number, a description of the issue and your preferred contact details.
          Please notify us as soon as reasonably possible after delivery; reporting within 7 days
          helps us investigate promptly. Photographs of the item, packaging and product label can
          help us assess the issue, but this request does not remove any rights you have under law.
        </p>

        <h2 className="text-white text-lg font-medium">3. Review and resolution</h2>
        <p>
          We will review the order and the information you provide. We may ask reasonable follow-up
          questions or request photographs or return of the item where appropriate. If a return is
          required, we will explain the process and who will bear the return shipping cost. We will
          communicate the proposed resolution and any applicable timeline.
        </p>

        <h2 className="text-white text-lg font-medium">4. Refund method and timing</h2>
        <p>
          Where a refund is approved or required, we will initiate it through the original payment
          method where practicable. The time taken for the amount to appear in your account may
          depend on the bank, card issuer, UPI app or payment provider. For Cash on Delivery orders,
          we will contact you to arrange a reasonable electronic refund method and verify the
          necessary details securely. Never share your UPI PIN, card PIN or password to receive a
          refund.
        </p>

        <h2 className="text-white text-lg font-medium">5. Order cancellations</h2>
        <p>
          If you wish to cancel an order, contact us as soon as possible at{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>{' '}
          and include your order number. We will check whether production or dispatch has started.
          A cancellation may not be possible after an item has entered production or has been
          handed to the courier, except where cancellation or another remedy is required by law.
          If VYQOUR cancels an accepted prepaid order, we will initiate an appropriate refund.
          We do not impose a cancellation fee except where permitted by law and on terms that comply
          with applicable requirements.
        </p>

        <h2 className="text-white text-lg font-medium">6. Undelivered and returned-to-origin orders</h2>
        <p>
          A shipment may be returned to origin if delivery cannot be completed, for example because
          an address is incomplete, the recipient cannot be contacted after courier attempts, or
          delivery is refused. We will review the tracking and circumstances and contact you where
          possible to discuss redelivery or another appropriate resolution. Any additional
          redelivery charge will be disclosed and agreed before redelivery is arranged. Refund
          eligibility and any deduction will be assessed according to the reason for non-delivery
          and applicable law; no deduction will be made where it is not legally permitted.
        </p>

        <h2 className="text-white text-lg font-medium">7. Exchanges and replacements</h2>
        <p>
          Where an exchange or replacement is appropriate and available, we will confirm the
          product, variant and expected dispatch timeline with you before arranging it. A
          replacement will not limit any further remedy required by applicable law if the issue
          remains unresolved.
        </p>

        <h2 className="text-white text-lg font-medium">8. Contact and grievances</h2>
        <p>
          For return, refund or cancellation requests, email{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>
          . If your concern is not resolved through customer support, you may raise a formal
          complaint through our{' '}
          <a href="/grievance-redressal" className="text-primary-glow underline">Grievance Redressal</a>{' '}
          page.
        </p>
      </div>
    </div>
  );
}
