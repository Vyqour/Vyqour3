import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'VYQOUR order processing, shipping, delivery and tracking information.',
};

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Customer Support</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Shipping Policy</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>Last updated: November 2026</p>
        <p>
          This policy explains how VYQOUR processes and delivers orders within India. Orders are
          prepared with the help of our fulfilment and courier partners. Availability and delivery
          estimates depend on the product, destination and courier service.
        </p>

        <h2 className="text-white text-lg font-medium">1. Delivery locations</h2>
        <p>
          We deliver to serviceable PIN codes in India. You can check serviceability by entering
          your delivery PIN code at checkout. An order may be unavailable for delivery if the
          destination is outside the courier network or cannot be serviced.
        </p>

        <h2 className="text-white text-lg font-medium">2. Order processing and dispatch</h2>
        <p>
          Products may be prepared or produced after an order is placed. Our current estimate for
          preparation and dispatch is 2–4 business days after order confirmation, unless a different
          estimate is shown on the product page or communicated for your order. Business days
          exclude Sundays and public holidays. We will share dispatch confirmation when the order
          is handed over for delivery.
        </p>

        <h2 className="text-white text-lg font-medium">3. Delivery estimates</h2>
        <p>
          After dispatch, delivery is currently estimated at 3–7 business days for most serviceable
          locations. The overall estimate is generally 5–10 business days from order confirmation.
          These are estimates, not guaranteed dates. Remote locations, courier capacity, weather,
          public holidays and other operational disruptions may extend delivery time. If a
          different delivery estimate is shown at checkout or communicated for your order, that
          order-specific estimate will apply.
        </p>

        <h2 className="text-white text-lg font-medium">4. Shipping charges</h2>
        <p>
          Any shipping or delivery charge applicable to your order will be displayed at checkout
          before you confirm payment. The amount may depend on the order and delivery destination.
          We will not add an undisclosed mandatory delivery charge after the order is placed.
        </p>

        <h2 className="text-white text-lg font-medium">5. Tracking your order</h2>
        <p>
          Once tracking information is made available by the courier, you can use the{' '}
          <a href="/track-order" className="text-primary-glow underline">Track Order</a>{' '}
          page or the Orders section of your account. Tracking details may take some time to appear
          after dispatch while the courier updates its system.
        </p>

        <h2 className="text-white text-lg font-medium">6. Delays, lost shipments and delivery issues</h2>
        <p>
          If tracking has not updated or your order has not arrived within the communicated
          estimate, contact us at{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>{' '}
          with your order number. We will check the available courier information and work with
          our fulfilment or courier partner to investigate. Any delay does not remove remedies
          available to you under applicable consumer law.
        </p>

        <h2 className="text-white text-lg font-medium">7. Address and delivery instructions</h2>
        <p>
          Please provide a complete and accurate address, PIN code and reachable phone number.
          Contact us promptly if you notice an error. Address changes may not be possible after
          the parcel has entered production or been handed to the courier. If an incorrect address
          supplied by the customer causes a failed delivery, we will review the circumstances and
          explain any available redelivery options and charges before proceeding.
        </p>

        <h2 className="text-white text-lg font-medium">8. Partial shipments and unavailable items</h2>
        <p>
          If an order cannot be fulfilled as accepted, we will contact you about the available
          options, which may include an alternative agreed with you or a refund for the affected
          item. We will not substitute a product without your agreement.
        </p>

        <h2 className="text-white text-lg font-medium">9. Contact</h2>
        <p>
          For shipping or delivery questions, email{' '}
          <a href="mailto:vyqourofficial@gmail.com" className="text-primary-glow underline">
            vyqourofficial@gmail.com
          </a>
          . For unresolved consumer complaints, visit our{' '}
          <a href="/grievance-redressal" className="text-primary-glow underline">Grievance Redressal</a>{' '}
          page.
        </p>
      </div>
    </div>
  );
}
