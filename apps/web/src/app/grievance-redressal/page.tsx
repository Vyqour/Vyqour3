import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grievance Redressal',
  description: 'How to raise a grievance with VYQOUR.',
};

export default function GrievanceRedressalPage() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">
        Customer Support
      </p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Grievance Redressal</h1>

      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>Last updated: November 2026</p>
        <p>
          VYQOUR is committed to addressing customer concerns fairly and promptly. If you are not
          satisfied with the response from our regular customer support team, you may raise a
          grievance with the Grievance Officer using the contact details below.
        </p>

        <h2 className="text-white text-lg font-medium">Grievance Officer details</h2>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p><strong className="text-white">Name:</strong> [PLACEHOLDER: Grievance Officer full name]</p>
          <p><strong className="text-white">Designation:</strong> Grievance Officer</p>
          <p><strong className="text-white">Business:</strong> VYQOUR</p>
          <p><strong className="text-white">Legal business name:</strong> [PLACEHOLDER: Legal name of the business operator]</p>
          <p><strong className="text-white">Principal business address:</strong> [PLACEHOLDER: Full business address]</p>
          <p><strong className="text-white">Customer care email:</strong> vyqourofficial@gmail.com</p>
          <p><strong className="text-white">Customer care phone:</strong> [PLACEHOLDER: Customer care phone number]</p>
          <p><strong className="text-white">Grievance email:</strong> [PLACEHOLDER: Grievance email address]</p>
          <p><strong className="text-white">Grievance Officer phone:</strong> [PLACEHOLDER: Grievance Officer phone number]</p>
          <p><strong className="text-white">Postal address:</strong> [PLACEHOLDER: Official business address]</p>
        </div>

        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-200">
          Internal setup reminder: Replace every placeholder above with verified business details
          before making this page publicly available. Do not publish this page with placeholder
          contact information.
        </p>

        <h2 className="text-white text-lg font-medium">How to submit a grievance</h2>
        <p>
          Send an email to the Grievance Officer using the email address listed above. Include your
          name, contact details, order number (if applicable), a clear description of the issue, and
          any relevant supporting information such as photographs or payment references. Please do
          not send full card numbers, passwords, or other sensitive authentication details.
        </p>

        <h2 className="text-white text-lg font-medium">Acknowledgement and resolution</h2>
        <p>
          We will acknowledge receipt of your complaint within 48 hours, provide you with a copy
          of the complaint as recorded by the Grievance Officer, and redress the complaint within
          one month from the date of receipt, in accordance with applicable consumer protection
          requirements.
        </p>

        <h2 className="text-white text-lg font-medium">Other support</h2>
        <p>
          For routine order, delivery, return, or product questions, you can also visit our{' '}
          <a href="/contact" className="text-primary-glow underline">Contact</a> page. This does not
          prevent you from raising a formal grievance with the Grievance Officer.
        </p>
      </div>
    </div>
  );
}
