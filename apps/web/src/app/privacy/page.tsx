import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How VYQOUR collects, uses, stores and protects personal information.',
};

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Privacy Policy</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>Last updated: November 2026</p>
        <p>
          This Privacy Policy explains how VYQOUR ("VYQOUR", "we", "us" or "our") collects, uses,
          shares and protects personal information when you visit our website, create an account,
          contact us or place an order in India. We handle personal information for specific
          business purposes and in accordance with applicable law.
        </p>

        <h2 className="text-white text-lg font-medium">1. Information we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-white">Account details:</strong> name, email address, phone number and account credentials.</li>
          <li><strong className="text-white">Order details:</strong> products and variants ordered, order history, delivery address, billing details where applicable, and order value.</li>
          <li><strong className="text-white">Payment details:</strong> payment status, transaction reference and related payment information. Card, UPI and banking credentials are handled by the payment service provider; VYQOUR does not ask you to send these credentials to us.</li>
          <li><strong className="text-white">Support communications:</strong> information and attachments you provide when contacting customer support or raising a grievance.</li>
          <li><strong className="text-white">Technical and usage information:</strong> information such as IP address, browser/device details, security logs and website interactions where collected by our website or service providers.</li>
        </ul>

        <h2 className="text-white text-lg font-medium">2. Why we use your information</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Create and manage your account and provide requested website features.</li>
          <li>Accept, process, manufacture/fulfil, ship and deliver your orders, including sharing necessary delivery information with our fulfilment and courier partners.</li>
          <li>Process payments, refunds, cancellations and payment-related enquiries through our payment service provider.</li>
          <li>Send order confirmations, delivery updates, service messages and responses to support requests.</li>
          <li>Protect the website, prevent fraud, investigate misuse and maintain business, tax and accounting records.</li>
          <li>Improve our products and services. We send promotional communications only where permitted and provide a way to opt out.</li>
        </ul>

        <h2 className="text-white text-lg font-medium">3. When we share information</h2>
        <p>We share only the information reasonably needed for the relevant purpose, including with:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-white">Payment providers, including Razorpay:</strong> to process payments and eligible refunds.</li>
          <li><strong className="text-white">Fulfilment and delivery partners, including Qikink and its courier partners where applicable:</strong> to prepare, dispatch and deliver orders and provide tracking.</li>
          <li><strong className="text-white">Website hosting, database, email and security providers:</strong> to operate, maintain and protect the website and communicate with you.</li>
          <li><strong className="text-white">Authorities and professional advisers:</strong> where disclosure is required by law or reasonably necessary to establish, exercise or defend legal claims.</li>
        </ul>
        <p>We do not sell your personal information to third parties for their independent marketing.</p>

        <h2 className="text-white text-lg font-medium">4. Payments</h2>
        <p>
          Online payments are processed by the payment provider shown at checkout. Your payment
          provider may collect and process payment credentials under its own terms and privacy
          policy. VYQOUR receives transaction and payment-status information needed to confirm
          orders, provide support and process refunds.
        </p>

        <h2 className="text-white text-lg font-medium">5. Cookies and similar technologies</h2>
        <p>
          The website may use essential cookies or similar technologies for functions such as
          account sessions, security and cart operation. If optional analytics or advertising
          technologies are enabled, we will provide appropriate information and choices as required
          by applicable law. You can also manage cookies through your browser, although disabling
          essential cookies may affect website functionality.
        </p>

        <h2 className="text-white text-lg font-medium">6. Data security</h2>
        <p>
          We use reasonable technical and organisational safeguards intended to protect personal
          information against unauthorised access, loss, misuse or alteration. No internet
          transmission or storage system can be guaranteed to be completely secure. If a personal
          data breach occurs, we will take appropriate steps and provide notices as required by
          applicable law.
        </p>

        <h2 className="text-white text-lg font-medium">7. How long we keep information</h2>
        <p>
          We retain information for as long as reasonably necessary for the purposes described in
          this policy, including account operation, order fulfilment, customer support, legal,
          tax and accounting requirements, fraud prevention and dispute resolution. When information
          is no longer required, we will take appropriate steps to delete or de-identify it, subject
          to applicable legal requirements.
        </p>

        <h2 className="text-white text-lg font-medium">8. Your privacy requests</h2>
        <p>
          Subject to applicable law and verification of your identity, you may contact us to request
          information about personal data associated with you, correction or updating of inaccurate
          information, or deletion where deletion is permitted. You may also withdraw consent where
          processing is based on consent. Withdrawal does not affect processing already carried out
          lawfully, and some information may need to be retained to meet legal obligations or resolve
          claims.
        </p>
        <p>
          Send privacy requests to{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>
          . Please describe your request and provide enough information for us to verify it. Do not
          email passwords, full card numbers or UPI PINs.
        </p>

        <h2 className="text-white text-lg font-medium">9. Children</h2>
        <p>
          Our website is not intended for independent use by children under 18. A person under 18
          should use the website and place orders only with the involvement and permission of a
          parent or lawful guardian. We do not knowingly seek to collect children's personal data
          without the consent required by applicable law.
        </p>

        <h2 className="text-white text-lg font-medium">10. Third-party websites</h2>
        <p>
          Our website may link to third-party websites or services. Their privacy practices are
          governed by their own policies, and we encourage you to review those policies before
          providing information to them.
        </p>

        <h2 className="text-white text-lg font-medium">11. Changes to this policy</h2>
        <p>
          We may update this policy when our practices or applicable law change. The revised policy
          will be published on this page with an updated date.
        </p>

        <h2 className="text-white text-lg font-medium">12. Contact</h2>
        <p>
          For privacy questions or requests, contact VYQOUR at{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>
          . For a consumer complaint, you may also use our{' '}
          <a href="/grievance-redressal" className="text-primary-glow underline">Grievance Redressal</a>{' '}
          page.
        </p>
      </div>
    </div>
  );
}
