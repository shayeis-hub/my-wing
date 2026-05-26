import Link from "next/link";

export const metadata = { title: "Privacy Policy – Wingpact" };

export default function PrivacyEnPage() {
  return (
    <div className="min-h-screen bg-wing-bg p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="pt-4">
          <Link href="/login" className="text-wing-primary text-sm">← Back</Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mt-1">Last updated: May 2026</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">1. Introduction</h2>
            <p>Wingpact ("the App", "we", "us") is a social weight-loss support application operated by Shay Eisen, Israel. We are committed to protecting your personal data. This policy explains what data we collect, how we use it, and your rights regarding it.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">2. Data We Collect</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Account data:</strong> name, email address</li>
              <li><strong>Health profile:</strong> age, height, weight, target weight, activity level, daily calorie target</li>
              <li><strong>Usage data:</strong> daily check-ins, meals logged, step counts, mood scores, workout logs</li>
              <li><strong>Meal photos:</strong> uploaded solely for AI nutritional analysis and deleted from our AI provider after processing</li>
              <li><strong>Device / notification token:</strong> for push notifications (optional)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>To provide the service: nutrition tracking, AI meal analysis, daily summaries</li>
              <li>To share progress within your "Wing" (your chosen support group)</li>
              <li>To send optional motivational push notifications</li>
              <li>To calculate and display health metrics (BMI, TDEE, calorie targets)</li>
            </ul>
            <p className="mt-1">We do <strong>not</strong> sell your data to third parties.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">4. Third-Party Services</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Google Firebase</strong> – authentication, database (Firestore), file storage, and push notifications. Data is stored on Google Cloud servers.</li>
              <li><strong>Anthropic Claude API</strong> – processes meal photos to generate nutritional estimates. Images are not retained after processing.</li>
              <li><strong>Paddle</strong> – handles all payment processing and subscription billing as Merchant of Record. We do not store payment card data.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">5. Data Retention</h2>
            <p>Your data is retained for as long as your account is active. You may delete your account and all associated data at any time from within the App settings. Upon deletion, data is permanently removed within 30 days.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">6. Your Rights</h2>
            <p>You have the right to access, correct, export, or delete your personal data at any time. To exercise these rights, use the in-app settings or contact us at the address below.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">7. Cookies</h2>
            <p>The App uses browser local storage to save your language preference and session data. We do not use advertising cookies.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">8. Contact</h2>
            <p>For any privacy-related questions or requests, please contact: <a href="mailto:shayeis@gmail.com" className="text-wing-primary underline">shayeis@gmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
