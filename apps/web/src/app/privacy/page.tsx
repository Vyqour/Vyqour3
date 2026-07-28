import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Privacy Policy</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">

        <p>Last updated: July 2026</p>
        <p>
          VYQOUR (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy. This policy explains what
          personal data we collect, why we collect it, how we use and protect it, and what rights you
          have, when you use vyqour.com and place orders with us in India.
        </p>

        <h2 className="text-white text-lg font-medium">1. Information we collect</h2>
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-white">Account information:</strong> name, email address, phone number, and password (stored in encrypted form).</li>
          <li><strong className="text-white">Order information:</strong> shipping and billing addresses, items purchased, order value, and order history.</li>
          <li><strong className="text-white">Payment information:</strong> we do not collect or store your card, UPI, or bank details. Payments are processed directly by our payment partner, Razorpay, under their own security and privacy standards.</li>
          <li><strong className="text-white">Technical information:</strong> IP address, browser type, device information, and pages visited, collected automatically to keep the site secure and working correctly.</li>
          <li><strong className="text-white">Communications:</strong> messages you send us via the Contact page, email, or customer support.</li>
        </ul>

        <h2 className="text-white text-lg font-medium">2. How we use your information</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>To process and fulfil your orders, including sharing your name, address, and phone number with our shipping/fulfilment partner so your order can be delivered.</li>
          <li>To communicate with you about your order status, shipping updates, and customer support requests.</li>
          <li>To detect and prevent fraud, abuse, and unauthorized transactions.</li>
          <li>To improve our website, products, and customer experience.</li>
          <li>To send marketing updates about new drops or offers, only if you have opted in — you can unsubscribe at any time.</li>
        </ul>

        <h2 className="text-white text-lg font-medium">3. Who we share data with</h2>
        <p>We share your information only where necessary to run our business, specifically with:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-white">Razorpay</strong> — to process your payment securely.</li>
          <li><strong className="text-white">Our manufacturing and shipping/fulfilment partner</strong> — to produce and deliver your made-to-order item.</li>
          <li><strong className="text-white">Hosting and infrastructure providers</strong> — to run our website and store order data securely.</li>
        </ul>
        <p>We do not sell, rent, or trade your personal data to third parties for their own marketing purposes.</p>

        <h2 className="text-white text-lg font-medium">4. Data security and breach notification</h2>
        <p>
          We use industry-standard measures — including encrypted password storage and secure
          connections (HTTPS) — to protect your data. However, no method of transmission or storage is
          100% secure, and we cannot guarantee absolute security. If we become aware of a security
          breach affecting your personal data, we will notify affected users and take reasonable steps
          to contain and address the issue as required by applicable law.
        </p>

        <h2 className="text-white text-lg font-medium">5. Data retention</h2>
        <p>
          We retain your account and order information for as long as your account is active and as
          needed to comply with our legal and accounting obligations, resolve disputes, and enforce
          our agreements.
        </p>

        <h2 className="text-white text-lg font-medium">6. Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal data, or withdraw
          consent for marketing communications, at any time by contacting{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>
          . We will respond to verified requests within a reasonable timeframe.
        </p>

        <h2 className="text-white text-lg font-medium">7. Cookies</h2>
        <p>
          We use essential cookies to keep you logged in and remember your cart. We may use analytics
          cookies to understand how visitors use our site, which helps us improve products and
          services. You can control or disable cookies through your browser settings, though some site
          features may not work correctly without them.
        </p>

        <h2 className="text-white text-lg font-medium">8. Account security and passwords</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account login and password,
          and for restricting access to your device. Notify us immediately at{' '}
          vyqourofficial@gmail.com if you suspect any unauthorized access to your account.
        </p>

        <h2 className="text-white text-lg font-medium">9. Children&apos;s privacy</h2>
        <p>
          VYQOUR is not intended for children under 18 without parental or guardian supervision. We do
          not knowingly collect personal data from unsupervised children.
        </p>

        <h2 className="text-white text-lg font-medium">10. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be posted on this page
          with a revised &quot;Last updated&quot; date. Continued use of the website after changes are posted
          constitutes acceptance of the revised policy.
        </p>

        <h2 className="text-white text-lg font-medium">11. Contact us</h2>
        <p>
          For any privacy-related questions or requests, contact us at{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>
          .
        </p>

      </div>
    </div>
  );
          }
