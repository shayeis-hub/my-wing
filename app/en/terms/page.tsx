import Link from "next/link";

export const metadata = { title: "Terms of Service – My Wing" };

export default function TermsEnPage() {
  return (
    <div className="min-h-screen bg-wing-bg p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="pt-4">
          <Link href="/login" className="text-wing-primary text-sm">← Back</Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">Terms of Service</h1>
          <p className="text-sm text-slate-500 mt-1">Last updated: May 2026</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">1. Acceptance of Terms</h2>
            <p>By accessing or using My Wing ("the App"), you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">2. Description of Service</h2>
            <p>My Wing is a web-based social weight-loss support application that allows users to track meals, log daily health data, receive AI-powered nutritional analysis, and share progress with a chosen support group ("Wing").</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">3. Medical Disclaimer</h2>
            <p className="font-medium text-amber-700 bg-amber-50 rounded-2xl p-3">My Wing is not a medical device and does not provide medical, nutritional, or dietetic advice. All information displayed is for personal tracking purposes only. Always consult a qualified physician or registered dietitian before making significant changes to your diet or exercise routine.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">4. Eligibility</h2>
            <p>You must be at least 18 years old to use this App. By creating an account you represent that you meet this requirement.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">5. User Responsibilities</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Provide accurate information when registering</li>
              <li>Keep your login credentials secure and confidential</li>
              <li>Do not upload offensive, harmful, or unlawful content</li>
              <li>Do not attempt to access other users' data</li>
              <li>Do not reverse-engineer, copy, or redistribute the App or its content</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">6. Subscriptions & Billing</h2>
            <p>My Wing offers a free tier and a paid Premium subscription. Subscriptions are billed on a monthly or annual basis through <strong>Paddle</strong>, who acts as Merchant of Record. By subscribing you also agree to <a href="https://www.paddle.com/legal/terms" className="text-wing-primary underline" target="_blank" rel="noopener noreferrer">Paddle's Terms of Service</a>. Billing, taxes, and refunds are governed by our <Link href="/en/refund" className="text-wing-primary underline">Refund Policy</Link>.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">7. Free Plan Limitations</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Up to 3 AI meal photo analyses per day</li>
              <li>Wing (group) size limited to 5 members</li>
            </ul>
            <p className="mt-1">Premium subscribers enjoy unlimited meal analysis and groups of up to 20 members.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">8. Intellectual Property</h2>
            <p>All rights in the App, including design, code, and content, are reserved by Shay Eisen. Nothing in these Terms grants you a license to copy, reproduce, or distribute any part of the App without prior written permission.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, My Wing and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App. The App is provided "as is" without warranties of any kind.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">10. Changes to Terms</h2>
            <p>We reserve the right to update these Terms at any time. Material changes will be announced in the App. Continued use following notice of changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Israel. Any disputes shall be subject to the exclusive jurisdiction of the courts in Israel.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">12. Contact</h2>
            <p>Questions about these Terms? Contact us at: <a href="mailto:shayeis@gmail.com" className="text-wing-primary underline">shayeis@gmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
