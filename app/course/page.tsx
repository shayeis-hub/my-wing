"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Play, ChevronDown } from "lucide-react";

/* ── Brand colours ─────────────────────────────────────── */
const C = {
  bg: "#fbf4e6",
  dark: "#1a1814",
  muted: "#6b5e4e",
  border: "#e8dcc8",
  orange: "#ff6b47",
  yellow: "#f5dd4b",
  green: "#4caf96",
};

/* ── 8 הרגלים ──────────────────────────────────────────── */
const NUTRITION_HABITS = [
  {
    n: 1,
    desc: "הרגל שמשאיר אותך שבע יותר זמן — בלי לאכול פחות",
  },
  {
    n: 2,
    desc: "שינוי בצלחת שמייצר נפח בלי עומס קלורי",
  },
  {
    n: 3,
    desc: "שבוע שמאפס את הגוף ומשנה את הקשר שלך למתוק לתמיד",
  },
  {
    n: 4,
    desc: "שיטה שמלמדת דיוק — לא ויתור",
  },
];

const LIFE_HABITS = [
  {
    n: 5,
    desc: "הרגל יומיומי שמגביר שריפת קלוריות בלי חדר כושר",
  },
  {
    n: 6,
    desc: "שינוי קטן שמשפיע על רמת האנרגיה, הריכוז והרעב לאורך כל היום",
  },
  {
    n: 7,
    desc: "הכלי שחושף את הקלוריות שאתה לא רואה — ולא יודע שאתה אוכל",
  },
  {
    n: 8,
    desc: "הטכניקה שמנתקת בין רגשות לאכילה — ונותנת לך שליטה אמיתית",
  },
];

/* ── מה מקבלים ────────────────────────────────────────── */
const INCLUDES = [
  "25 סרטוני וידאו — 3 סרטונים בשבוע, לאורך 8 שבועות",
  "חומרי עזר שבועיים — משימה, טיפ בונוס, סיכום סוף שבוע",
  "גישה ל-Wingpact Premium לכל משך הקורס",
  "כנף ייעודית לקהל המחזור — תחרות, עידוד, אחריות",
  "גישה לחיים לתכנים לאחר סיום המחזור",
];

/* ── Email form ────────────────────────────────────────── */
function WaitlistForm({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [name, setName]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "exists" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus("error"); return; }
      setStatus(data.alreadyRegistered ? "exists" : "done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className={`flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-5 py-4 ${className}`}>
        <CheckCircle2 size={24} className="text-[#f5dd4b] shrink-0" />
        <div>
          <p className="font-bold text-white text-base">נרשמת בהצלחה!</p>
          <p className="text-sm text-white/70">נשלח לך מייל כשנפתחת ההרשמה.</p>
        </div>
      </div>
    );
  }

  if (status === "exists") {
    return (
      <div className={`flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-5 py-4 ${className}`}>
        <CheckCircle2 size={24} className="text-[#4caf96] shrink-0" />
        <p className="font-bold text-white text-base">כבר רשום — נתראה בקורס 👊</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${className}`}>
      <input
        type="text"
        placeholder="שם פרטי"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-[#f5dd4b]"
        dir="rtl"
      />
      <input
        type="email"
        placeholder="כתובת מייל"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-[#f5dd4b]"
        dir="ltr"
      />
      {status === "error" && (
        <p className="text-sm text-red-400">משהו השתבש, נסה שוב</p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-3.5 rounded-xl font-bold text-base text-[#1a1814] transition-opacity disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
      >
        {status === "loading" ? "שומר..." : "אני רוצה להצטרף לרשימה"}
      </button>
      <p className="text-xs text-center text-white/40">חינם · בלי ספאם · ניתן להסרה בכל עת</p>
    </form>
  );
}

/* ── Page ──────────────────────────────────────────────── */
export default function CoursePage() {
  return (
    <main className="min-h-screen" style={{ background: C.bg, direction: "rtl" }}>
      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: C.bg, borderColor: C.border }}
      >
        <Link href="/" className="flex items-center gap-2">
          <WingLogoSmall />
          <span className="font-bold text-lg" style={{ color: C.dark }}>Wingpact</span>
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium" style={{ color: C.muted }}>
          <Link href="/blog"    className="hover:text-[#ff6b47] transition-colors hidden sm:block">בלוג</Link>
          <Link href="/faq"     className="hover:text-[#ff6b47] transition-colors hidden sm:block">שאלות נפוצות</Link>
          <Link
            href="/dashboard"
            className="px-4 py-1.5 rounded-full text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
          >
            לאפליקציה
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="px-6 py-20 text-center"
        style={{ background: C.dark }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Badge */}
          <span
            className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-6"
            style={{ background: "#f5dd4b20", color: "#f5dd4b", border: "1px solid #f5dd4b40" }}
          >
            קורס 8 שבועות · הרשמה מוקדמת פתוחה
          </span>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            ניסית, ירדת, עלית.
          </h1>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: "#f5dd4b" }}>
            כי דיאטות לא עובדות. הרגלים כן.
          </h2>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            קורס וידאו של 8 שבועות שבונה אחד אחד את ההרגלים הבסיסיים שגורמים לירידה בריאה במשקל —
            בלי עומס, בלי דיאטה, בלי לחזור לנקודת ההתחלה.
          </p>

          {/* Form */}
          <div className="max-w-sm mx-auto">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── Video placeholder ── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8" style={{ color: C.dark }}>
          סרטון הפתיחה
        </h2>
        <div
          className="relative w-full rounded-3xl overflow-hidden flex items-center justify-center"
          style={{ background: C.dark, aspectRatio: "16/9" }}
        >
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(245,221,75,0.2)", border: "2px solid #f5dd4b" }}
            >
              <Play size={28} style={{ color: "#f5dd4b" }} />
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>סרטון הפתיחה יעלה בקרוב</p>
          </div>
        </div>
      </section>

      {/* ── 8 הרגלים ── */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-3" style={{ color: C.dark }}>
          8 הרגלי בסיס. 8 שבועות.
        </h2>
        <p className="text-center mb-12 text-base max-w-xl mx-auto leading-relaxed" style={{ color: C.muted }}>
          לא דיאטה, לא תוכנית אכילה. כל שבוע תאמץ הרגל אחד — ותעשה אותו עד שהוא הופך לחלק ממך.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* תזונה */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xl">🥗</span>
              <h3 className="font-black text-lg" style={{ color: C.dark }}>4 הרגלי תזונה</h3>
            </div>
            <div className="space-y-4">
              {NUTRITION_HABITS.map((h) => (
                <div key={h.n} className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mt-0.5"
                    style={{ background: "#f5dd4b30", color: C.dark }}
                  >
                    {h.n}
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{h.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* חיים */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xl">⚡</span>
              <h3 className="font-black text-lg" style={{ color: C.dark }}>4 הרגלי חיים</h3>
            </div>
            <div className="space-y-4">
              {LIFE_HABITS.map((h) => (
                <div key={h.n} className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mt-0.5"
                    style={{ background: "#ff6b4720", color: C.orange }}
                  >
                    {h.n}
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── מה מקבלים ── */}
      <section className="px-6 py-16" style={{ background: "#fff" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-10" style={{ color: C.dark }}>
            מה מקבלים בקורס
          </h2>
          <div className="space-y-4">
            {INCLUDES.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 size={20} className="shrink-0 mt-0.5" style={{ color: C.green }} />
                <span className="text-base" style={{ color: C.dark }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Wingpact highlight */}
          <div
            className="mt-10 rounded-2xl p-6 flex items-start gap-4"
            style={{ background: "#fbf4e6", border: `1px solid ${C.border}` }}
          >
            <WingLogoSmall size={40} />
            <div>
              <p className="font-bold text-base mb-1" style={{ color: C.dark }}>
                Wingpact Premium — כלול בקורס
              </p>
              <p className="text-sm" style={{ color: C.muted }}>
                כנף ייעודית לאנשי המחזור שלך, ניתוח ארוחות ב-AI, צ׳ק-אין יומי, תחרות צעדים ואתגרים שבועיים —
                הכל בתוך האפליקציה, לאורך כל 8 שבועות הקורס.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA סוף דף ── */}
      <section
        className="px-6 py-20 text-center"
        style={{ background: C.dark }}
      >
        <div className="max-w-sm mx-auto">
          <h2 className="text-3xl font-black text-white mb-3">
            מתחילים?
          </h2>
          <p className="mb-8 text-base" style={{ color: "rgba(255,255,255,0.6)" }}>
            השאר מייל עכשיו — תקבל התראה ראשון כשנפתחת ההרשמה למחזור הבא.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-8 px-6 text-center text-sm border-t"
        style={{ color: C.muted, borderColor: C.border, background: C.bg }}
      >
        <p>
          <Link href="/" className="hover:underline">Wingpact</Link>
          {" · "}
          <Link href="/privacy" className="hover:underline">פרטיות</Link>
          {" · "}
          <Link href="/terms" className="hover:underline">תנאים</Link>
        </p>
      </footer>
    </main>
  );
}

/* ── Logo component ─────────────────────────────────────── */
function WingLogoSmall({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="wg-c" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5dd4b" />
          <stop offset="1" stopColor="#ff6b47" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="48" ry="48" fill="url(#wg-c)" />
      <path
        d="M50 75 C30 60 15 45 20 30 C25 15 40 20 50 35 C60 20 75 15 80 30 C85 45 70 60 50 75Z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}
