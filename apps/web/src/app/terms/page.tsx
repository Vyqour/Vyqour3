import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms governing purchases and use of the VYQOUR website.',
};

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Terms &amp; Conditions</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>Last updated: November 2026</p>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p><strong className="text-white">Business / brand:</strong> VYQOUR</p>
          <p><strong className="text-white">Legal name of business operator:</strong> [PLACEHOLDER: Insert verified legal name]</p>
          <p><strong className="text-white">Principal business address:</strong> [PLACEHOLDER: Insert complete business address]</p>
          <p><strong className="text-white">Website:</strong> vyqour.com</p>
          <p><strong className="text-white">Customer care email:</strong> vyqourofficial@gmail.com</p>
        </div>
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-200">
          Setup reminder: Replace the legal name and address placeholders with verified business
          information before publishing this policy.
        </p>
        <p>
          These Terms &amp; Conditions ("Terms") govern your access to and use of the VYQOUR website
          and purchases made through it. "VYQOUR", "we", "us" and "our" refer to the business
          operating the VYQOUR brand in India. By using the website or placing an order, you agree
          to these Terms. If you do not agree, please do not use the website.
        </p>

        <h2 className="text-white text-lg font-medium">1. Eligibility and account information</h2>
        <p>
          You must be legally capable of entering into a purchase transaction. If you are under 18,
          a parent or lawful guardian must be involved in your use of the website and any purchase.
          You must provide accurate, current contact and delivery information and keep your account
          credentials confidential. Contact us promptly if you suspect unauthorised account access.
        </p>

        <h2 className="text-white text-lg font-medium">2. Products and product information</h2>
        <p>
          VYQOUR offers apparel and accessories featuring designs selected for the brand. Products
          may be produced or prepared after an order is placed through our fulfilment partners.
          Product pages contain the relevant descriptions, size information, available colours and
          other specifications. Please review these details before ordering. Screen settings,
          materials and production processes can cause minor differences in colour or appearance;
          this does not limit your rights if an item is defective, damaged or materially different
          from its description.
        </p>

        <h2 className="text-white text-lg font-medium">3. Orders and acceptance</h2>
        <p>
          When you submit an order, you are making an offer to purchase the selected products.
          We may contact you to verify order or delivery details. An order is accepted when we
          confirm it through the website or an order-confirmation communication. We may decline or
          cancel an order where there is a genuine reason, such as an item being unavailable,
          an obvious pricing/listing error, suspected fraud or inability to deliver. If we cancel
          an accepted order after payment, we will initiate an appropriate refund.
        </p>

        <h2 className="text-white text-lg font-medium">4. Prices, taxes and payment</h2>
        <p>
          Prices are displayed in Indian Rupees (INR). Applicable shipping charges, taxes and other
          mandatory amounts, if any, will be shown before you place the order. Payment methods may
          include online payment through the payment provider displayed at checkout and Cash on
          Delivery where available. An order requiring online payment will be processed after
          payment confirmation. Never share your card PIN, UPI PIN, password or one-time password
          with anyone claiming to represent VYQOUR.
        </p>

        <h2 className="text-white text-lg font-medium">5. Shipping and delivery</h2>
        <p>
          Delivery is available only to serviceable locations. Production, dispatch and delivery
          estimates, tracking information and shipping charges are described in our{' '}
          <a href="/shipping-policy" className="text-primary-glow underline">Shipping Policy</a>{' '}
          and displayed during checkout where applicable. Delivery estimates are not guaranteed;
          however, this does not remove any consumer rights available under applicable law.
        </p>

        <h2 className="text-white text-lg font-medium">6. Cancellations, returns and refunds</h2>
        <p>
          Our cancellation, return, replacement and refund process is explained in the{' '}
          <a href="/refund" className="text-primary-glow underline">Refund Policy</a>. Some
          made-to-order items may not be eligible for a change-of-mind return once production has
          started, but nothing in these Terms excludes remedies available under consumer protection
          law, including where a product is defective, deficient, damaged, spurious, not as described
          or delivered later than the promised time without a legally recognised exception.
        </p>

        <h2 className="text-white text-lg font-medium">7. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the website for unlawful, fraudulent or misleading activity.</li>
          <li>Attempt to access accounts, systems or data without authorisation.</li>
          <li>Interfere with the security, availability or operation of the website.</li>
          <li>Upload malicious code or submit another person's personal information without authority.</li>
          <li>Copy, reproduce or commercially use VYQOUR's protected designs, branding or content without permission.</li>
        </ul>

        <h2 className="text-white text-lg font-medium">8. Intellectual property</h2>
        <p>
          The VYQOUR name, logos, original designs, graphics, website text and other brand materials
          are owned by VYQOUR or used with permission, and may be protected by applicable intellectual
          property laws. You may not reproduce or commercially exploit these materials without prior
          written permission, except where the law permits.
        </p>

        <h2 className="text-white text-lg font-medium">9. Website availability</h2>
        <p>
          We aim to keep the website available and accurate, but maintenance, technical issues or
          events outside our reasonable control may interrupt access. We may update product
          information or website features. We will not use this provision to avoid obligations
          arising from an order already accepted or rights provided by law.
        </p>

        <h2 className="text-white text-lg font-medium">10. Liability</h2>
        <p>
          To the extent permitted by applicable law, VYQOUR is not responsible for indirect losses
          that could not reasonably have been anticipated. Nothing in these Terms limits liability
          or remedies that cannot lawfully be excluded, including statutory consumer rights.
        </p>

        <h2 className="text-white text-lg font-medium">11. Suspension and account closure</h2>
        <p>
          We may restrict or suspend access where reasonably necessary to protect the website,
          customers or business from fraud, security threats or serious misuse. You may contact us
          to request account closure. Closing an account does not remove records we are legally
          required or otherwise permitted to retain.
        </p>

        <h2 className="text-white text-lg font-medium">12. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of India. Disputes are subject to the jurisdiction
          of competent courts and consumer dispute forums under applicable law. Nothing in this
          clause takes away a consumer's right to approach a competent consumer commission or
          authority.
        </p>

        <h2 className="text-white text-lg font-medium">13. Changes to these Terms</h2>
        <p>
          We may revise these Terms from time to time. The latest version will be posted on this
          page with its updated date. Changes will not retrospectively remove rights or obligations
          relating to an order already accepted.
        </p>

        <h2 className="text-white text-lg font-medium">14. Contact</h2>
        <p>
          For questions about these Terms or an order, contact{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>
          . For formal consumer complaints, visit our{' '}
          <a href="/grievance-redressal" className="text-primary-glow underline">Grievance Redressal</a>{' '}
          page.
        </p>
      </div>
    </div>
  );
}
