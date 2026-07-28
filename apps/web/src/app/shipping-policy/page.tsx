import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Shipping Policy' };

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Shipping Policy</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">

        <p>Last updated: July 2026</p>
        <p>
          This policy explains how VYQOUR ships orders across India. Because every VYQOUR item is
          made to order with an original design, our timelines include a short production window
          before dispatch — please read below for exact estimates.
        </p>

        <h2 className="text-white text-lg font-medium">1. Where we ship</h2>
        <p>
          We currently ship to serviceable pin codes across India through our logistics partner. At
          checkout, you can confirm whether your pin code is serviceable by entering your delivery
          address.
        </p>

        <h2 className="text-white text-lg font-medium">2. Production and dispatch time</h2>
        <p>
          Since each order is custom-made, please allow <strong className="text-white">2–4 business
          days</strong> for your item to be produced and handed over to our courier partner after
          your payment is confirmed. You will receive a confirmation email once your order is
          dispatched.
        </p>

        <h2 className="text-white text-lg font-medium">3. Delivery time</h2>
        <p>
          Once dispatched, delivery typically takes <strong className="text-white">3–7 business
          days</strong> depending on your location, so total time from order to delivery is usually{' '}
          <strong className="text-white">5–10 business days</strong>. Remote or rural pin codes may
          take a little longer. These are estimates and not guaranteed delivery dates — delays caused
          by courier networks, weather, regional disruptions, or incorrect addresses are outside our
          control.
        </p>

        <h2 className="text-white text-lg font-medium">4. Shipping charges</h2>
        <p>
          We charge a flat shipping fee of ₹99 per order. Orders of ₹1,999 and above ship free
          anywhere in India. Any applicable shipping fee is shown clearly at checkout before you pay.
        </p>

        <h2 className="text-white text-lg font-medium">5. Order tracking</h2>
        <p>
          Once your order ships, we email you the tracking details. You can also track your order any
          time using the <a href="/track-order" className="text-primary-glow underline">Track Order</a> page
          with your order number, or from your account under Orders.
        </p>

        <h2 className="text-white text-lg font-medium">6. Delayed or lost shipments</h2>
        <p>
          If your order has not arrived within the estimated window, please contact us at{' '}
          vyqourofficial@gmail.com with your order number and we will investigate with our courier
          partner and update you promptly.
        </p>

        <h2 className="text-white text-lg font-medium">7. Incorrect address</h2>
        <p>
          Please double-check your shipping address before placing your order. We are not responsible
          for delays or non-delivery caused by an incorrect or incomplete address provided at
          checkout, though we will do our best to assist in resolving it with our courier partner.
        </p>

        <h2 className="text-white text-lg font-medium">8. Contact us</h2>
        <p>
          For any shipping-related questions, reach us at{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>
          .
        </p>

      </div>
    </div>
  );
}
