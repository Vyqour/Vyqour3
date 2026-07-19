import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function Page() {
  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Legal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Privacy Policy</h1>
      <div className="prose-invert-custom mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        
        <p>Last updated: July 2026</p>
        <p>VYQOUR (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains how we collect, use, and protect personal data when you use vyqour.com and related services in India.</p>
        <h2 className="text-white text-lg font-medium">Information we collect</h2>
        <p>Account details (name, email, phone), shipping addresses, order history, device/browser data, and communications you send us.</p>
        <h2 className="text-white text-lg font-medium">How we use data</h2>
        <p>To process orders, provide support, improve the store, prevent fraud, and send optional marketing if you opt in.</p>
        <h2 className="text-white text-lg font-medium">Sharing</h2>
        <p>We share data with payment processors, logistics partners, and infrastructure providers only as needed to fulfill orders. We do not sell personal data.</p>
        <h2 className="text-white text-lg font-medium">Your rights</h2>
        <p>You may request access, correction, or deletion of your account data by contacting support@vyqour.com.</p>

      </div>
    </div>
  );
}
