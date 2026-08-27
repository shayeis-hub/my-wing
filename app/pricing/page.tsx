import Link from "next/link";
import { Check } from "lucide-react";

export const metadata = { title: "מחירים – Wingpact | מבנה כנף" };

const FREE_FEATURES = [
  "צ׳ק-אפ יומי (מים, ירקות, צעדים, מצב רוח, משקל)",
  "רישום ארוחות ידני עם חישוב קלוריות",
  "עד 3 ניתוחי תמונת ארוחה ביום עם AI",
  "מבנה כנף של עד 3 חברים",
  "לוח התקדמות יומי ושבועי",
  "לוח תוצאות צעדים בתוך הכנף",
];

const PREMIUM_FEATURES = [
  "כל מה שיש בחינם",
  "ניתוחי תמונת ארוחה ללא הגבלה",
  "כנף של עד 20 חברים",
  "סיכום יומי ותובנות מבוססות AI",
  "ללא פרסומות",
  "תמיכה מועדפת",
];

export default function PricingHePage() {
  return (
    <div className="min-h-screen bg-wing-bg p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="pt-4">
          <Link href="/login" className="text-wing-primary text-sm">→ חזרה</Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-800">מחיר פשוט וכנה</h1>
          <p className="text-slate-500">מתחילים חינם, משדרגים כשצריך יותר.</p>
        </div>

        {/* Plans */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Free */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">חינם</p>
              <p className="text-3xl font-black text-slate-800 mt-1">₪0</p>
              <p className="text-sm text-slate-400">לתמיד</p>
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
              התחל חינם
            </Link>
          </div>

          {/* Premium */}
          <div className="bg-gradient-to-br from-[#e8773a] to-[#c25a22] rounded-3xl shadow-lg p-6 space-y-5 text-white">
            <div>
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider">פרמיום</p>
              <div className="flex items-end gap-1 mt-1">
                <p className="text-3xl font-black">₪9.90</p>
                <p className="text-white/70 mb-1">/ לחודש</p>
              </div>
              <p className="text-sm text-white/70">או ₪99 לשנה <span className="text-yellow-300 font-semibold">(חסכון 17%)</span></p>
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
              התחל פרמיום
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800 text-lg">שאלות נפוצות</h2>

          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">אפשר לבטל בכל עת?</p>
              <p className="mt-1">כן. ניתן לבטל את המנוי בכל עת דרך דף ניהול המנוי. הגישה לפרמיום תישמר עד סוף תקופת החיוב הנוכחית.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">איך משדרגים?</p>
              <p className="mt-1">השדרוג נעשה בתוך אפליקציית מבנה כנף (App Store או Google Play), והחיוב מתבצע דרך חשבון Apple/Google שלכם.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">המחיר כולל מע״מ?</p>
              <p className="mt-1">המחירים המוצגים אינם כוללים מיסים החלים. מיסים מקומיים עשויים להתווסף בקופה כנדרש על פי חוק.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">מה זה "כנף"?</p>
              <p className="mt-1">כנף היא קבוצת התמיכה האישית שלך — מעגל קטן ואמין (משפחה, חברים, או קבוצת דיאטה) שחולקים יחד צ'ק-אפים יומיים ומעודדים אחד את השני. כל חבר רואה את ההתקדמות, הארוחות והרצף של האחרים.</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          שאלות? <a href="mailto:contact@wingpact.app" className="underline">contact@wingpact.app</a>
        </p>
      </div>
    </div>
  );
}
