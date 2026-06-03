import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wingpact | טסים ביחד",
  description: "אפליקציית תמיכה חברתית לירידה במשקל. קבוצה קטנה של חברים שמתעדים ארוחות, עושים צ'ק-אפ יומי ומתחרים על צעדים — ביחד.",
};

const FEATURES = [
  {
    icon: "📸",
    title: "AI ניתוח ארוחות",
    desc: "צלם את הצלחת — Claude AI מחשב קלוריות, חלבון, פחמימות ושומן תוך שניות.",
  },
  {
    icon: "✅",
    title: "צ׳ק-אפ יומי",
    desc: "2 דקות בערב: מים, ירקות, אימון, מצב רוח. AI מסכם את היום ונותן טיפ למחר.",
  },
  {
    icon: "💬",
    title: "פיד קבוצתי",
    desc: "שתפו פוסטים, ענו על שאלה יומית, ועודדו חברים עם תגובות מהירות.",
  },
  {
    icon: "👟",
    title: "תחרות צעדים",
    desc: "לוח תוצאות יומי של הקבוצה לפי צעדים. מי בראש הלהקה היום?",
  },
  {
    icon: "🏆",
    title: "אתגרים שבועיים",
    desc: "מנהל הכנף מפעיל אתגרים — מים, ירקות, צעדים. המנצחים מקבלים גביעים.",
  },
  {
    icon: "🤝",
    title: "הכנף שלך",
    desc: "עד 20 חברים שרואים את הנתונים שלך ואתה רואה שלהם. אחריות אמיתית.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "צור כנף",
    desc: "הזמן עד 20 חברים — משפחה, חברים, קבוצת דיאטה. כולם מצטרפים דרך קישור.",
  },
  {
    n: "2",
    title: "תעד את היום",
    desc: "צלם ארוחות, עדכן צעדים, מלא צ׳ק-אפ ערב. AI מנתח הכל תוך שניות.",
  },
  {
    n: "3",
    title: "עודד ותתחרה",
    desc: "ראה מה חברים אכלו, שלח עידוד, תתחרה על לוח התוצאות. הקבוצה שומרת אותך על הדרך.",
  },
];

export default function LandingPage() {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#fbf4e6",
        color: "#1a1814",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Navbar ── */}
      <nav
        style={{
          borderBottom: "1px solid #ede5d0",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: "#fbf4e6",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="28" height="18" viewBox="0 0 72 44" fill="none">
            <defs>
              <linearGradient id="ng" x1="72" y1="0" x2="0" y2="44">
                <stop offset="0" stopColor="#f5dd4b" />
                <stop offset="1" stopColor="#ff6b47" />
              </linearGradient>
            </defs>
            <path d="M4 38 L36 8 L68 38" stroke="url(#ng)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="36" cy="8" r="5" fill="#d4541a" />
            <circle cx="20" cy="23" r="3.5" fill="#1a1814" />
            <circle cx="52" cy="23" r="3.5" fill="#1a1814" />
          </svg>
          <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.03em" }}>Wingpact</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/en/pricing" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>
            Pricing
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1a1814",
              background: "linear-gradient(135deg, #f5dd4b, #ff6b47)",
              padding: "8px 18px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            כניסה
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "72px 24px 56px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "white",
            border: "1px solid #ede5d0",
            borderRadius: 999,
            padding: "4px 16px",
            fontSize: 13,
            color: "#8a7e68",
            marginBottom: 24,
          }}
        >
          🐦 ציפורי נדידה טסות ביחד — כך גם אתם
        </div>
        <h1
          style={{
            fontSize: "clamp(36px, 7vw, 60px)",
            fontWeight: 900,
            letterSpacing: "-0.045em",
            lineHeight: 0.95,
            marginBottom: 24,
          }}
        >
          הקבוצה שתעזור לך
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #c79a00, #d4541a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            להצליח לרדת במשקל
          </span>
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "#5a4f3f", maxWidth: 520, margin: "0 auto 36px" }}>
          קבוצה קטנה של חברים שמתעדים ארוחות יחד, עושים צ׳ק-אפ יומי ומתחרים על צעדים.
          AI מנתח כל ארוחה תוך שניות. האחריות ההדדית עובדת.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/register"
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#1a1814",
              background: "linear-gradient(135deg, #f5dd4b, #ff6b47)",
              padding: "14px 32px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            התחל חינם ✦
          </Link>
          <Link
            href="/en/pricing"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#1a1814",
              background: "white",
              border: "1.5px solid #ede5d0",
              padding: "14px 32px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            ראה מחירים
          </Link>
        </div>
        <p style={{ fontSize: 13, color: "#8a7e68", marginTop: 16 }}>
          ניסיון חינם 14 יום · לא צריך כרטיס אשראי
        </p>
      </section>

      {/* ── V-formation concept ── */}
      <section style={{ display: "flex", justifyContent: "center", padding: "0 24px 64px" }}>
        <div
          style={{
            background: "white",
            border: "1px solid #ede5d0",
            borderRadius: 24,
            padding: "32px 40px",
            maxWidth: 540,
            width: "100%",
            textAlign: "center",
          }}
        >
          <svg width="180" height="120" viewBox="0 0 220 150" fill="none" style={{ margin: "0 auto 20px", display: "block" }}>
            <defs>
              <linearGradient id="vg2" x1="220" y1="0" x2="0" y2="150">
                <stop offset="0" stopColor="#f5dd4b" />
                <stop offset="1" stopColor="#ff6b47" />
              </linearGradient>
            </defs>
            <path d="M18 130 L110 30 L202 130" stroke="url(#vg2)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 4" opacity="0.3" />
            <path d="M18 130 L110 30 L202 130" stroke="url(#vg2)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="110" cy="30" r="11" fill="#d4541a" />
            <text x="110" y="34" textAnchor="middle" fontFamily="system-ui" fontWeight="800" fontSize="9" fill="white">מנהל</text>
            <circle cx="64" cy="80" r="9" fill="#1a1814" />
            <text x="64" y="84" textAnchor="middle" fontFamily="system-ui" fontWeight="700" fontSize="8" fill="white">חבר</text>
            <circle cx="156" cy="80" r="9" fill="#1a1814" />
            <text x="156" y="84" textAnchor="middle" fontFamily="system-ui" fontWeight="700" fontSize="8" fill="white">חבר</text>
            <circle cx="40" cy="110" r="7" fill="#8a7e68" />
            <circle cx="180" cy="110" r="7" fill="#8a7e68" />
          </svg>
          <p style={{ fontSize: 14, color: "#5a4f3f", lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
            כשהעוף המוביל שובר את הרוח, כל שאר חברי הלהקה צורכים פחות אנרגיה.
            זה הרעיון מאחורי Wingpact —{" "}
            <strong>לטוס ביחד, להגיע רחוק יותר.</strong>
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: "-0.035em",
            marginBottom: 40,
          }}
        >
          כל מה שצריך במקום אחד
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "white",
                border: "1px solid #ede5d0",
                borderRadius: 20,
                padding: "20px 22px",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, margin: "0 0 6px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#5a4f3f", lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: "#1a1814", color: "#fbf4e6", padding: "64px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.035em", marginBottom: 8 }}>
            איך זה עובד?
          </h2>
          <p style={{ color: "#a8a090", marginBottom: 48 }}>שלושה צעדים פשוטים</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {STEPS.map((step) => (
              <div key={step.n} style={{ display: "flex", gap: 20, alignItems: "flex-start", textAlign: "right" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: "linear-gradient(135deg, #f5dd4b, #ff6b47)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 16,
                    color: "#1a1814",
                    flexShrink: 0,
                  }}
                >
                  {step.n}
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: 17, marginBottom: 4, margin: "0 0 4px" }}>{step.title}</h3>
                  <p style={{ color: "#a8a090", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section style={{ maxWidth: 600, margin: "0 auto", padding: "72px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.035em", marginBottom: 8 }}>
          מחיר פשוט וכנה
        </h2>
        <p style={{ color: "#8a7e68", marginBottom: 40 }}>מתחילים חינם, משדרגים כשצריך יותר</p>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div
            style={{
              background: "white",
              border: "1.5px solid #ede5d0",
              borderRadius: 20,
              padding: "28px 24px",
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8a7e68", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
              חינם
            </p>
            <p style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>₪0</p>
            <p style={{ fontSize: 13, color: "#8a7e68", marginBottom: 20 }}>לתמיד</p>
            <p style={{ fontSize: 13, color: "#5a4f3f", lineHeight: 1.5 }}>
              צ׳ק-אפ יומי, 3 ניתוחי ארוחה ביום, כנף של עד 3 חברים
            </p>
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #e8773a, #c25a22)",
              borderRadius: 20,
              padding: "28px 24px",
              color: "white",
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
              פרמיום
            </p>
            <p style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>₪9.90</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>לחודש</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
              ניתוח ללא הגבלה, כנף 20 חברים, AI יומי, ללא פרסומות
            </p>
          </div>
        </div>
        <Link
          href="/en/pricing"
          style={{ display: "inline-block", marginTop: 20, fontSize: 14, color: "#d4541a", textDecoration: "underline" }}
        >
          כל הפרטים על המחירים ←
        </Link>
      </section>

      {/* ── Final CTA ── */}
      <section
        style={{
          background: "linear-gradient(135deg, #fff3b8, #ffc89a)",
          padding: "64px 24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 12 }}>
          מוכן לטוס ביחד?
        </h2>
        <p style={{ color: "#5a4220", marginBottom: 32, fontSize: 16 }}>
          הצטרף ל-Wingpact היום — 14 יום חינם, ללא צורך בכרטיס אשראי.
        </p>
        <Link
          href="/register"
          style={{
            fontSize: 17,
            fontWeight: 800,
            background: "#1a1814",
            color: "#fbf4e6",
            padding: "16px 40px",
            borderRadius: 999,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          התחל חינם ✦
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #ede5d0", padding: "24px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
          <Link href="/en/pricing" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>Pricing</Link>
          <Link href="/terms" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>תנאי שימוש</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>פרטיות</Link>
          <Link href="/contact" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>צור קשר</Link>
          <Link href="/login" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>כניסה</Link>
        </div>
        <p style={{ fontSize: 12, color: "#c9bc9c", margin: 0 }}>© 2026 Wingpact · wingpact.app</p>
      </footer>
    </div>
  );
}
