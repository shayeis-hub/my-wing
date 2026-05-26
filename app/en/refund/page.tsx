import Link from "next/link";

export const metadata = { title: "Refund Policy – My Wing" };

export default function RefundEnPage() {
  return (
    <div className="min-h-screen bg-wing-bg p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="pt-4">
          <Link href="/login" className="text-wing-primary text-sm">← Back</Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">Refund Policy</h1>
          <p className="text-sm text-slate-500 mt-1">Last updated: May 2026</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">1. Merchant of Record</h2>
            <p>All payments for My Wing Premium subscriptions are processed by <strong>Paddle</strong> (paddle.com), who acts as the Merchant of Record. Paddle is responsible for billing, invoicing, tax collection, and handling payment disputes on our behalf.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">2. 14-Day Money-Back Guarantee</h2>
            <p>If you are not satisfied with your My Wing Premium subscription, you may request a full refund within <strong>14 days</strong> of your initial purchase. To request a refund within this period, contact us at <a href="mailto:shayeis@gmail.com" className="text-wing-primary underline">shayeis@gmail.com</a> with the subject line "Refund Request" and your registered email address.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">3. Renewals</h2>
            <p>Subscription renewals (monthly or annual) are generally non-refundable after the new billing period has begun. Exceptions may be made at our sole discretion in cases of documented technical issues that prevented access to the service.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">4. Cancellation</h2>
            <p>You may cancel your subscription at any time via the in-app subscription management page. Cancellation stops future charges; it does not generate a refund for the current billing period (except as covered by the 14-day guarantee above).</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">5. Free Plan</h2>
            <p>The Free plan is provided at no charge and is not subject to this refund policy.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">6. How Refunds Are Processed</h2>
            <p>Approved refunds are issued to the original payment method within 5–10 business days, depending on your card issuer. Refunds are processed by Paddle on our behalf.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">7. Contact</h2>
            <p>For refund requests or billing questions, please contact: <a href="mailto:shayeis@gmail.com" className="text-wing-primary underline">shayeis@gmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
