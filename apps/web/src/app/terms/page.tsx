import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms & Conditions' };

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Terms & Conditions</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">

        <p>Last updated: July 2026</p>
        <p>
          These Terms & Conditions (&quot;Terms&quot;) govern your use of vyqour.com and any purchase you
          make from VYQOUR (&quot;VYQOUR&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;). VYQOUR is an unregistered
          partnership run by three founders, based in India. By browsing this website, creating an
          account, or placing an order, you (&quot;User&quot;, &quot;you&quot;) agree to be bound by these Terms.
          Please read them carefully before using our services. VYQOUR reserves the right to update
          these Terms at any time; continued use of the website after changes are posted constitutes
          acceptance of the revised Terms.
        </p>

        <h2 className="text-white text-lg font-medium">1. Eligibility</h2>
        <p>
          You must be at least 18 years old, or accessing the website under the supervision of a
          parent or legal guardian, to place an order. By using VYQOUR, you represent that you meet
          this requirement and that the information you provide is accurate and complete.
        </p>

        <h2 className="text-white text-lg font-medium">2. About our products</h2>
        <p>
          VYQOUR products feature original, in-house designs created specifically for our brand. Each
          item is made to order once you place your purchase — we work with a manufacturing and
          printing partner to produce and dispatch your order rather than holding pre-made stock.
          Because of this, minor variations in print placement, color, or fabric texture between
          production batches are normal and do not indicate a defect.
        </p>

        <h2 className="text-white text-lg font-medium">3. Account registration</h2>
        <p>
          To place an order, you will need to create an account with a valid email address and
          password. You are responsible for maintaining the confidentiality of your login credentials
          and for all activity that occurs under your account. Notify us immediately at{' '}
          vyqourofficial@gmail.com if you suspect any unauthorized use of your account.
        </p>

        <h2 className="text-white text-lg font-medium">4. Orders and acceptance</h2>
        <p>
          Placing an order on VYQOUR is an offer to purchase, which we accept once your payment is
          confirmed and your order status changes to &quot;Confirmed.&quot; We reserve the right to cancel or
          refuse any order — including after payment — in cases of suspected fraud, pricing or listing
          errors, or inability to fulfil the order, and will refund any amount already paid in such
          cases.
        </p>

        <h2 className="text-white text-lg font-medium">5. Pricing and payments</h2>
        <p>
          All prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless
          stated otherwise. We accept payment via Razorpay (UPI, cards, netbanking, wallets) and Cash
          on Delivery (COD) where available. We do not store your card or bank details — payments are
          processed securely by our payment partner, Razorpay, under its own security standards.
        </p>

        <h2 className="text-white text-lg font-medium">6. Shipping and delivery</h2>
        <p>
          Orders are shipped across India through our logistics and fulfilment partner. Estimated
          production, dispatch, and delivery timelines are described on our{' '}
          <a href="/shipping-policy" className="text-primary-glow underline">Shipping Policy</a> page.
          These timelines are estimates and not guaranteed; delays due to courier networks, weather,
          or regional disruptions are outside our control.
        </p>

        <h2 className="text-white text-lg font-medium">7. Returns, replacements, and refunds</h2>
        <p>
          Because our products are made to order with custom designs, we do not accept returns for
          reasons of personal preference (such as wrong size chosen or change of mind). We offer
          replacements for items that arrive damaged, defective, or incorrect, and handle undelivered
          shipments as described in our{' '}
          <a href="/refund" className="text-primary-glow underline">Refund Policy</a> page.
        </p>

        <h2 className="text-white text-lg font-medium">8. Prohibited conduct</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Attempt unauthorized access to our website, systems, or other users&apos; accounts.</li>
          <li>Submit fraudulent orders, false information, or unauthorized payment details.</li>
          <li>Copy, reproduce, or resell VYQOUR designs, content, or product photography without permission.</li>
          <li>Use the website in any way that could disrupt, damage, or harm VYQOUR, its partners, or other users.</li>
        </ul>

        <h2 className="text-white text-lg font-medium">9. Intellectual property</h2>
        <p>
          All VYQOUR designs, graphics, logos, product photography, and site content are original
          works owned by VYQOUR or licensed to us, and are protected under Indian copyright and
          trademark law. You may not reproduce, resell, or repurpose our designs or content without
          our prior written permission.
        </p>

        <h2 className="text-white text-lg font-medium">10. Limitation of liability</h2>
        <p>
          VYQOUR is not liable for indirect, incidental, or consequential damages arising from the use
          of our website or products, to the maximum extent permitted by Indian law. Our total
          liability for any claim is limited to the amount paid for the relevant order. We make no
          warranty that the website will be error-free or uninterrupted at all times.
        </p>

        <h2 className="text-white text-lg font-medium">11. Termination</h2>
        <p>
          We may suspend or terminate your account if we reasonably believe you have violated these
          Terms, engaged in fraudulent activity, or misused our website. You may also request deletion
          of your account at any time by contacting us.
        </p>

        <h2 className="text-white text-lg font-medium">12. Governing law and jurisdiction</h2>
        <p>
          These Terms are governed by the laws of India. Any disputes arising from these Terms or your
          use of VYQOUR will be subject to the exclusive jurisdiction of courts in India.
        </p>

        <h2 className="text-white text-lg font-medium">13. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time to reflect changes in our business or applicable
          law. The updated version will be posted on this page with a revised &quot;Last updated&quot; date.
        </p>

        <h2 className="text-white text-lg font-medium">14. Contact us</h2>
        <p>
          For any questions about these Terms, reach us at{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>
          .
        </p>

      </div>
    </div>
  );
      }
