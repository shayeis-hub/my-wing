"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, ChevronRight } from "lucide-react";

type Gender = "male" | "female";
type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: "יושבני (כמעט ללא פעילות)",
  light: "פעילות קלה (1-3 ימים/שבוע)",
  moderate: "פעילות בינונית (3-5 ימים/שבוע)",
  active: "פעילות גבוהה (6-7 ימים/שבוע)",
  very_active: "פעילות אינטנסיבית מאד (2 פעמים/יום)",
};

const ACTIVITY_MULTIPLIERS: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function calcBMR(gender: Gender, weight: number, height: number, age: number): number {
  if (gender === "male") return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export default function CalculatorPage() {
  const [gender, setGender] = useState<Gender>("female");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [result, setResult] = useState<null | { bmr: number; tdee: number; loss: number }>(null);

  function calculate() {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!w || !h || !a || w < 30 || h < 100 || a < 10 || a > 120) return;
    const bmr = Math.round(calcBMR(gender, w, h, a));
    const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
    const loss = Math.max(tdee - 500, 1200);
    setResult({ bmr, tdee, loss });
  }

  return (
    <main className="min-h-screen" style={{ background: "#fbf4e6" }}>
      <PublicNav />

      {/* Breadcrumb */}
      <div className="max-w-2xl mx-auto px-6 pt-6 text-sm flex items-center gap-1" style={{ color: "#9e8e7e" }}>
        <Link href="/" className="hover:text-[#ff6b47] transition-colors">בית</Link>
        <ChevronRight size={14} />
        <span style={{ color: "#6b5e4e" }}>מחשבון קלוריות</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
          >
            <Calculator size={28} color="white" />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#1a1814" }}>
            מחשבון קלוריות יומי
          </h1>
          <p style={{ color: "#6b5e4e" }}>
            חשב את ה-BMR וה-TDEE שלך, וקבל המלצה לצריכה יומית לירידה במשקל
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl p-8 shadow-sm mb-6">
          {/* Gender */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1814" }}>
              מגדר
            </label>
            <div className="flex gap-3">
              {(["female", "male"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{
                    borderColor: gender === g ? "#ff6b47" : "#e8dcc8",
                    background: gender === g ? "#fff0e6" : "white",
                    color: gender === g ? "#ff6b47" : "#6b5e4e",
                  }}
                >
                  {g === "female" ? "אישה" : "גבר"}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "משקל (ק\"ג)", value: weight, set: setWeight, placeholder: "70" },
              { label: "גובה (ס\"מ)", value: height, set: setHeight, placeholder: "165" },
              { label: "גיל", value: age, set: setAge, placeholder: "30" },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1814" }}>
                  {label}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className="w-full border-2 rounded-xl px-3 py-2.5 text-center font-semibold text-lg outline-none transition-colors"
                  style={{
                    borderColor: "#e8dcc8",
                    background: "#faf6ef",
                    color: "#1a1814",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#ff6b47")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e8dcc8")}
                />
              </div>
            ))}
          </div>

          {/* Activity */}
          <div className="mb-8">
            <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1814" }}>
              רמת פעילות
            </label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as Activity)}
              className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none"
              style={{ borderColor: "#e8dcc8", background: "#faf6ef", color: "#1a1814" }}
            >
              {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
                <option key={a} value={a}>
                  {ACTIVITY_LABELS[a]}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={calculate}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
          >
            חשב
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-6 text-center" style={{ color: "#1a1814" }}>
              התוצאות שלך
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                {
                  label: "BMR",
                  value: result.bmr.toLocaleString(),
                  sub: "חילוף חומרים בסיסי",
                  color: "#5b8dee",
                },
                {
                  label: "TDEE",
                  value: result.tdee.toLocaleString(),
                  sub: "סה״כ שריפה יומית",
                  color: "#f5dd4b",
                },
                {
                  label: "יעד",
                  value: result.loss.toLocaleString(),
                  sub: "לירידה של 0.5 ק״ג/שבוע",
                  color: "#ff6b47",
                },
              ].map(({ label, value, sub, color }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 text-center"
                  style={{ background: `${color}15` }}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color }}>
                    {label}
                  </div>
                  <div className="text-2xl font-bold mb-0.5" style={{ color: "#1a1814" }}>
                    {value}
                  </div>
                  <div className="text-xs" style={{ color: "#9e8e7e" }}>
                    קלוריות/יום
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#9e8e7e" }}>
                    {sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Explanation */}
            <div className="rounded-2xl p-5" style={{ background: "#faf6ef" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "#1a1814" }}>
                מה המספרים האלה אומרים?
              </p>
              <ul className="space-y-2 text-sm" style={{ color: "#6b5e4e" }}>
                <li>
                  <strong>BMR ({result.bmr.toLocaleString()} קל׳)</strong> — כמה קלוריות הגוף שלך שורף בזמן
                  מנוחה מוחלטת.
                </li>
                <li>
                  <strong>TDEE ({result.tdee.toLocaleString()} קל׳)</strong> — סך הקלוריות שאתה שורף ביום,
                  כולל פעילות. זה ה"איפס" שלך — אם תאכל כמות זו, המשקל יישאר יציב.
                </li>
                <li>
                  <strong>יעד ({result.loss.toLocaleString()} קל׳)</strong> — גירעון של 500 קלוריות ביום
                  יוביל לירידה של ~0.5 ק״ג בשבוע בצורה בריאה ובת-קיימא.
                </li>
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-6 text-center">
              <p className="text-sm mb-3" style={{ color: "#6b5e4e" }}>
                מעקב קלוריות עם תמיכה חברתית עובד פי 3 יותר טוב
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-8 py-3 rounded-full text-white font-semibold text-sm"
                style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
              >
                התחל לעקוב עם Wingpact
              </Link>
            </div>
          </div>
        )}

        {/* Explanation article */}
        <div className="mt-10 bg-white rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-4" style={{ color: "#1a1814" }}>
            איך עובד החישוב?
          </h2>
          <div className="space-y-4 text-sm" style={{ color: "#6b5e4e" }}>
            <p>
              המחשבון משתמש בנוסחת <strong>Mifflin-St Jeor</strong>, שנחשבת לנוסחה המדויקת ביותר הקיימת
              כיום לחישוב BMR לאנשים לא-ספורטאיים.
            </p>
            <p>
              <strong>גברים:</strong> BMR = (10 × משקל) + (6.25 × גובה) − (5 × גיל) + 5
            </p>
            <p>
              <strong>נשים:</strong> BMR = (10 × משקל) + (6.25 × גובה) − (5 × גיל) − 161
            </p>
            <p>
              לאחר חישוב ה-BMR, מכפילים אותו במכפיל הפעילות (Harris-Benedict) כדי לקבל את ה-TDEE — צריכת
              הקלוריות הכוללת היומית.
            </p>
            <p className="text-xs" style={{ color: "#9e8e7e" }}>
              שים לב: כל נוסחה היא הערכה. הגוף של כל אדם שונה. התוצאות לא מחליפות ייעוץ תזונאי מקצועי.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function PublicNav() {
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
      style={{ background: "#fbf4e6", borderColor: "#e8dcc8" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <WingLogoSmall />
        <span className="font-bold text-lg" style={{ color: "#1a1814" }}>
          Wingpact
        </span>
      </Link>
      <div className="flex items-center gap-5 text-sm font-medium" style={{ color: "#6b5e4e" }}>
        <Link href="/blog" className="hover:text-[#ff6b47] transition-colors">
          בלוג
        </Link>
        <Link href="/calculator" className="hover:text-[#ff6b47] transition-colors">
          מחשבון
        </Link>
        <Link href="/faq" className="hover:text-[#ff6b47] transition-colors">
          שאלות נפוצות
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-1.5 rounded-full text-white text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
        >
          התחל עכשיו
        </Link>
      </div>
    </nav>
  );
}

function WingLogoSmall() {
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="wg-d" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5dd4b" />
          <stop offset="1" stopColor="#ff6b47" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="48" ry="48" fill="url(#wg-d)" />
      <path
        d="M50 75 C30 60 15 45 20 30 C25 15 40 20 50 35 C60 20 75 15 80 30 C85 45 70 60 50 75Z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}
