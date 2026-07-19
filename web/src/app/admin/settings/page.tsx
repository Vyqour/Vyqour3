export default function AdminSettingsPage() {
  return (
    <div className="glass rounded-2xl p-6 space-y-3 text-sm text-muted-foreground">
      <h2 className="text-white font-medium">Store settings</h2>
      <p>Brand: VYQOUR</p>
      <p>Tagline: Wear Your Identity.</p>
      <p>Currency: INR (₹)</p>
      <p>Free shipping minimum: ₹1,999</p>
      <p>Flat shipping: ₹99</p>
      <p>Support: support@vyqour.com</p>
      <p className="pt-4">Configure environment variables on the API for SMTP, Cloudinary, Razorpay, Google OAuth, and Sentry.</p>
    </div>
  );
}
