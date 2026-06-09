"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Camera, ClipboardCheck, MessageCircle, Footprints,
  Trophy, Users, ArrowLeft, ArrowRight,
} from "lucide-react";

/* ─────────────────────────────────────────────
   All copy in both languages
───────────────────────────────────────────── */
const COPY = {
  he: {
    dir: "rtl" as const,
    lang: "he",
    nav_blog: "בלוג",
    nav_calculator: "מחשבון",
    nav_faq: "שאלות",
    nav_pricing: "מחירים",
    nav_login: "כניסה",
    hero_badge: "ציפורי נדידה טסות ביחד — כך גם אתם",
    hero_h1_a: "הקבוצה שתעזור לך",
    hero_h1_b: "להצליח לרדת במשקל",
    hero_sub:
      "קבוצה קטנה של חברים שמתעדים ארוחות יחד, עושים צ׳ק-אפ יומי ומתחרים על צעדים. AI מנתח כל ארוחה תוך שניות. האחריות ההדדית עובדת.",
    cta_start: "התחל חינם",
    cta_pricing: "ראה מחירים",
    cta_trial: "ניסיון חינם 14 יום · לא צריך כרטיס אשראי",
    concept_text:
      "כשהעוף המוביל שובר את הרוח, כל שאר חברי הלהקה צורכים פחות אנרגיה. זה הרעיון מאחורי Wingpact — ",
    concept_bold: "לטוס ביחד, להגיע רחוק יותר.",
    concept_leader: "מנהל",
    concept_member: "חבר",
    features_h2: "כל מה שצריך במקום אחד",
    features: [
      { title: "AI ניתוח ארוחות", desc: "צלם את הצלחת — Claude AI מחשב קלוריות, חלבון, פחמימות ושומן תוך שניות." },
      { title: "צ׳ק-אפ יומי", desc: "2 דקות בערב: מים, ירקות, אימון, מצב רוח. AI מסכם את היום ונותן טיפ למחר." },
      { title: "פיד קבוצתי", desc: "שתפו פוסטים, ענו על שאלה יומית, ועודדו חברים עם תגובות מהירות." },
      { title: "תחרות צעדים", desc: "לוח תוצאות יומי של הקבוצה לפי צעדים. מי בראש הלהקה היום?" },
      { title: "אתגרים שבועיים", desc: "מנהל הכנף מפעיל אתגרים — מים, ירקות, צעדים. המנצחים מקבלים גביעים." },
      { title: "הכנף שלך", desc: "עד 20 חברים שרואים את הנתונים שלך ואתה רואה שלהם. אחריות אמיתית." },
    ],
    how_h2: "איך זה עובד?",
    how_sub: "שלושה צעדים פשוטים",
    steps: [
      { n: "1", title: "צור כנף", desc: "הזמן עד 20 חברים — משפחה, חברים, קבוצת דיאטה. כולם מצטרפים דרך קישור." },
      { n: "2", title: "תעד את היום", desc: "צלם ארוחות, עדכן צעדים, מלא צ׳ק-אפ ערב. AI מנתח הכל תוך שניות." },
      { n: "3", title: "עודד ותתחרה", desc: "ראה מה חברים אכלו, שלח עידוד, תתחרה על לוח התוצאות. הקבוצה שומרת אותך על הדרך." },
    ],
    pricing_h2: "מחיר פשוט וכנה",
    pricing_sub: "מתחילים חינם, משדרגים כשצריך יותר",
    free_label: "חינם",
    free_price: "₪0",
    free_period: "לתמיד",
    free_desc: "צ׳ק-אפ יומי, 3 ניתוחי ארוחה ביום, כנף של עד 3 חברים",
    premium_label: "פרמיום",
    premium_price: "₪9.90",
    premium_period: "לחודש",
    premium_annual: "₪99 / שנה",
    premium_save: "(חסכון 17%)",
    premium_desc: "ניתוח ללא הגבלה, כנף 20 חברים, AI יומי, ללא פרסומות",
    pricing_link: "כל הפרטים על המחירים ←",
    final_h2: "מוכן לטוס ביחד?",
    final_sub: "הצטרף ל-Wingpact היום — 14 יום חינם, ללא צורך בכרטיס אשראי.",
    footer_terms: "תנאי שימוש",
    footer_privacy: "פרטיות",
    footer_contact: "צור קשר",
    footer_login: "כניסה",
  },
  en: {
    dir: "ltr" as const,
    lang: "en",
    nav_blog: "Blog",
    nav_calculator: "Calculator",
    nav_faq: "FAQ",
    nav_pricing: "Pricing",
    nav_login: "Log in",
    hero_badge: "Migratory birds fly together — so do you",
    hero_h1_a: "The group that helps you",
    hero_h1_b: "actually lose weight",
    hero_sub:
      "A small circle of friends who log meals together, do a daily check-up, and compete on steps. AI analyses every meal in seconds. Mutual accountability works.",
    cta_start: "Start for free",
    cta_pricing: "View pricing",
    cta_trial: "14-day free trial · No credit card required",
    concept_text:
      "When the lead bird breaks the wind, every other member of the flock uses less energy. That's the idea behind Wingpact — ",
    concept_bold: "fly together, go further.",
    concept_leader: "leader",
    concept_member: "member",
    features_h2: "Everything you need, in one place",
    features: [
      { title: "AI Meal Analysis", desc: "Photograph your plate — Claude AI calculates calories, protein, carbs and fat in seconds." },
      { title: "Daily Check-up", desc: "2 minutes each evening: water, veggies, workout, mood. AI summarises the day and gives a tip for tomorrow." },
      { title: "Social Feed", desc: "Share posts, answer the daily question, and react to teammates with quick reactions." },
      { title: "Step Leaderboard", desc: "Daily group leaderboard by steps. Who's leading the flock today?" },
      { title: "Weekly Challenges", desc: "Your wing leader launches challenges — water, veggies, steps. Winners earn trophies." },
      { title: "Your Wing", desc: "Up to 20 members who see your data and you see theirs. Real accountability." },
    ],
    how_h2: "How does it work?",
    how_sub: "Three simple steps",
    steps: [
      { n: "1", title: "Create a wing", desc: "Invite up to 20 friends — family, friends, or a diet group. Everyone joins via a link." },
      { n: "2", title: "Log your day", desc: "Photo your meals, update your steps, fill in the evening check-up. AI analyses everything in seconds." },
      { n: "3", title: "Encourage & compete", desc: "See what teammates ate, send encouragement, compete on the leaderboard. The group keeps you on track." },
    ],
    pricing_h2: "Simple, honest pricing",
    pricing_sub: "Start free. Upgrade when you need more.",
    free_label: "Free",
    free_price: "$0",
    free_period: "forever",
    free_desc: "Daily check-up, 3 AI meal analyses/day, wing of up to 3 members",
    premium_label: "Premium",
    premium_price: "$3.90",
    premium_period: "/ month",
    premium_annual: "$39 / year",
    premium_save: "(save 17%)",
    premium_desc: "Unlimited meal analysis, 20-member wing, daily AI summary, no ads",
    pricing_link: "See full pricing details →",
    final_h2: "Ready to fly together?",
    final_sub: "Join Wingpact today — 14 days free, no credit card needed.",
    footer_terms: "Terms",
    footer_privacy: "Privacy",
    footer_contact: "Contact",
    footer_login: "Log in",
  },
};

// Icons parallel to features array (language-agnostic)
const FEATURE_ICONS = [Camera, ClipboardCheck, MessageCircle, Footprints, Trophy, Users];

type Lang = "he" | "en";

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("he");

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language || "";
    setLang(browserLang.startsWith("he") ? "he" : "en");
  }, []);

  const t = COPY[lang];

  return (
    <div
      dir={t.dir}
      lang={t.lang}
      style={{
        minHeight: "100vh",
        background: "#fbf4e6",
        color: "#1a1814",
        fontFamily: "'Heebo', system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Google Fonts — Heebo */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap');`}</style>

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
        {/* Logo */}
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

        {/* Nav actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            style={{
              background: "white",
              border: "1px solid #ede5d0",
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#8a7e68",
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.04em",
            }}
          >
            {lang === "he" ? "EN" : "עב"}
          </button>
          <Link href="/blog" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none", padding: "0 4px" }}>
            {t.nav_blog}
          </Link>
          <Link href="/calculator" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none", padding: "0 4px" }}>
            {t.nav_calculator}
          </Link>
          <Link href="/faq" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none", padding: "0 4px" }}>
            {t.nav_faq}
          </Link>
          <Link
            href="/en/pricing"
            style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none", padding: "0 4px" }}
          >
            {t.nav_pricing}
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
            {t.nav_login}
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "72px 24px 56px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "white",
            border: "1px solid #ede5d0",
            borderRadius: 999,
            padding: "5px 18px",
            fontSize: 13,
            color: "#8a7e68",
            marginBottom: 24,
          }}
        >
          {/* Wing logo as badge icon */}
          <svg width="16" height="10" viewBox="0 0 72 44" fill="none">
            <defs>
              <linearGradient id="bg" x1="72" y1="0" x2="0" y2="44">
                <stop offset="0" stopColor="#f5dd4b" />
                <stop offset="1" stopColor="#ff6b47" />
              </linearGradient>
            </defs>
            <path d="M4 38 L36 8 L68 38" stroke="url(#bg)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="36" cy="8" r="5" fill="#d4541a" />
          </svg>
          {t.hero_badge}
        </div>
        <h1
          style={{
            fontSize: "clamp(36px, 7vw, 60px)",
            fontWeight: 900,
            letterSpacing: "-0.045em",
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          {t.hero_h1_a}
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #c79a00, #d4541a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t.hero_h1_b}
          </span>
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: "#5a4f3f", maxWidth: 520, margin: "0 auto 36px" }}>
          {t.hero_sub}
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
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {t.cta_start}
            {lang === "he"
              ? <ArrowLeft size={16} strokeWidth={2.5} />
              : <ArrowRight size={16} strokeWidth={2.5} />}
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
            {t.cta_pricing}
          </Link>
        </div>
        <p style={{ fontSize: 13, color: "#8a7e68", marginTop: 16 }}>{t.cta_trial}</p>
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
            <text x="110" y="34" textAnchor="middle" fontFamily="Heebo, system-ui" fontWeight="800" fontSize="9" fill="white">{t.concept_leader}</text>
            <circle cx="64" cy="80" r="9" fill="#1a1814" />
            <text x="64" y="84" textAnchor="middle" fontFamily="Heebo, system-ui" fontWeight="700" fontSize="8" fill="white">{t.concept_member}</text>
            <circle cx="156" cy="80" r="9" fill="#1a1814" />
            <text x="156" y="84" textAnchor="middle" fontFamily="Heebo, system-ui" fontWeight="700" fontSize="8" fill="white">{t.concept_member}</text>
            <circle cx="40" cy="110" r="7" fill="#8a7e68" />
            <circle cx="180" cy="110" r="7" fill="#8a7e68" />
          </svg>
          <p style={{ fontSize: 15, color: "#5a4f3f", lineHeight: 1.65, maxWidth: 380, margin: "0 auto" }}>
            {t.concept_text}
            <strong>{t.concept_bold}</strong>
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 840, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 900, letterSpacing: "-0.035em", marginBottom: 40 }}>
          {t.features_h2}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {t.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <div key={f.title} style={{ background: "white", border: "1px solid #ede5d0", borderRadius: 20, padding: "22px 24px" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "linear-gradient(135deg, #f5dd4b, #ff6b47)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                }}>
                  <Icon size={20} strokeWidth={2} color="#1a1814" />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 16, margin: "0 0 6px" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#5a4f3f", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: "#1a1814", color: "#fbf4e6", padding: "64px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.035em", marginBottom: 8 }}>{t.how_h2}</h2>
          <p style={{ color: "#a8a090", marginBottom: 48 }}>{t.how_sub}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {t.steps.map((step) => (
              <div key={step.n} style={{ display: "flex", gap: 20, alignItems: "flex-start", textAlign: lang === "he" ? "right" : "left" }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 999,
                    background: "linear-gradient(135deg, #f5dd4b, #ff6b47)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 16, color: "#1a1814", flexShrink: 0,
                  }}
                >
                  {step.n}
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: 17, margin: "0 0 4px" }}>{step.title}</h3>
                  <p style={{ color: "#a8a090", fontSize: 14, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section style={{ maxWidth: 600, margin: "0 auto", padding: "72px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.035em", marginBottom: 8 }}>{t.pricing_h2}</h2>
        <p style={{ color: "#8a7e68", marginBottom: 40 }}>{t.pricing_sub}</p>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          {/* Free */}
          <div style={{ background: "white", border: "1.5px solid #ede5d0", borderRadius: 20, padding: "28px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8a7e68", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
              {t.free_label}
            </p>
            <p style={{ fontSize: 36, fontWeight: 900, margin: "0 0 4px" }}>{t.free_price}</p>
            <p style={{ fontSize: 13, color: "#8a7e68", marginBottom: 20 }}>{t.free_period}</p>
            <p style={{ fontSize: 13, color: "#5a4f3f", lineHeight: 1.55, margin: 0 }}>{t.free_desc}</p>
          </div>
          {/* Premium */}
          <div style={{ background: "linear-gradient(135deg, #e8773a, #c25a22)", borderRadius: 20, padding: "28px 24px", color: "white" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
              {t.premium_label}
            </p>
            <p style={{ fontSize: 36, fontWeight: 900, margin: "0 0 2px" }}>{t.premium_price}</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
              {t.premium_period}
            </p>
            <p style={{ fontSize: 12, color: "#fde68a", marginBottom: 16 }}>
              {t.premium_annual} {t.premium_save}
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.55, margin: 0 }}>{t.premium_desc}</p>
          </div>
        </div>
        <Link
          href="/en/pricing"
          style={{ display: "inline-block", marginTop: 20, fontSize: 14, color: "#d4541a", textDecoration: "underline" }}
        >
          {t.pricing_link}
        </Link>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ background: "linear-gradient(135deg, #fff3b8, #ffc89a)", padding: "64px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 12 }}>{t.final_h2}</h2>
        <p style={{ color: "#5a4220", marginBottom: 32, fontSize: 16 }}>{t.final_sub}</p>
        <Link
          href="/register"
          style={{
            fontSize: 17, fontWeight: 800,
            background: "#1a1814", color: "#fbf4e6",
            padding: "16px 40px", borderRadius: 999, textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}
        >
          {t.cta_start}
          {lang === "he"
            ? <ArrowLeft size={17} strokeWidth={2.5} />
            : <ArrowRight size={17} strokeWidth={2.5} />}
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #ede5d0", padding: "24px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
          <Link href="/blog" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>{t.nav_blog}</Link>
          <Link href="/calculator" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>{t.nav_calculator}</Link>
          <Link href="/faq" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>{t.nav_faq}</Link>
          <Link href="/en/pricing" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>{t.nav_pricing}</Link>
          <Link href="/terms" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>{t.footer_terms}</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>{t.footer_privacy}</Link>
          <Link href="/contact" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>{t.footer_contact}</Link>
          <Link href="/login" style={{ fontSize: 13, color: "#8a7e68", textDecoration: "none" }}>{t.footer_login}</Link>
        </div>
        <p style={{ fontSize: 12, color: "#c9bc9c", margin: 0 }}>© 2026 Wingpact · wingpact.app</p>
      </footer>
    </div>
  );
}
