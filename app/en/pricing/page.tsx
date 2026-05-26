import Link from "next/link";
import { Check } from "lucide-react";

export const metadata = { title: "Pricing – Wingpact" };

const FREE_FEATURES = [
  "Daily check-ins (water, vegetables, steps, mood, weight)",
  "Manual meal logging with calorie calculation",
  "Up to 3 AI meal photo analyses per day",
  "Wing (support group) of up to 5 members",
  "Daily & weekly progress calendar",
  "Step leaderboard within your Wing",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Unlimited AI meal photo analyses",
  "Wing of up to 20 members",
  "AI-generated daily day-summary & insights",
  "No ads",
  "Priority support",
];

export default function PricingEnPage() {
  return (
    <div className="min-h-screen bg-wing-bg p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="pt-4">
          <Link href="/login" className="text-wing-primary text-sm">← Back</Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-800">Simple, honest pricing</h1>
          <p className="text-slate-500">Start free. Upgrade when you need more.</p>
        </div>

        {/* Plans */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Free */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Free</p>
              <p className="text-3xl font-black text-slate-800 mt-1">₪0</p>
              <p className="text-sm text-slate-400">forever</p>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block text-center w-full py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Premium */}
          <div className="bg-gradient-to-br from-[#e8773a] to-[#c25a22] rounded-3xl shadow-lg p-6 space-y-5 text-white">
            <div>
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Premium</p>
              <div className="flex items-end gap-1 mt-1">
                <p className="text-3xl font-black">₪9.90</p>
                <p className="text-white/70 mb-1">/ month</p>
              </div>
              <p className="text-sm text-white/70">or ₪99 / year <span className="text-yellow-300 font-semibold">(save 16%)</span></p>
            </div>
            <ul className="space-y-2.5">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/90">
                  <Check size={16} className="text-yellow-300 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/subscription"
              className="block text-center w-full py-3 rounded-2xl bg-white text-sm font-bold text-[#c25a22] hover:bg-white/90 transition-colors"
            >
              Start Premium
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800 text-lg">Frequently asked questions</h2>

          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">Can I cancel anytime?</p>
              <p className="mt-1">Yes. You can cancel your subscription at any time from the subscription management page. You'll retain Premium access until the end of the current billing period.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">What payment methods are accepted?</p>
              <p className="mt-1">All major credit and debit cards (Visa, Mastercard, American Express). Payments are securely processed by Paddle.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Is VAT included in the price?</p>
              <p className="mt-1">Prices shown are exclusive of applicable taxes. Israeli VAT (17%) will be added at checkout where required by law.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">What is a "Wing"?</p>
              <p className="mt-1">A Wing is your personal support group — a small, trusted circle (family, friends, or a diet group) who share their daily health check-ins and encourage each other. Every member can see each other's progress, meals, and streaks.</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          Questions? <a href="mailto:shayeis@gmail.com" className="underline">shayeis@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
