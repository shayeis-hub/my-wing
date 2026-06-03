"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Mail, AlertTriangle, Lightbulb, ShieldCheck, Handshake, Copy, Check, ChevronRight } from "lucide-react";

const CONTACT_EMAIL = "contact@wingpact.app";

const CATEGORIES = {
  he: [
    {
      Icon: AlertTriangle,
      title: "דיווח על תקלה",
      desc: "משהו לא עובד כמו שצריך",
      subject: "דיווח על תקלה",
    },
    {
      Icon: Lightbulb,
      title: "רעיון לפיצ׳ר",
      desc: "יש לך רעיון שישפר את האפליקציה",
      subject: "רעיון לפיצ׳ר",
    },
    {
      Icon: ShieldCheck,
      title: "פרטיות ומחיקת חשבון",
      desc: "בקשה למחיקת נתוניך או שאלות פרטיות",
      subject: "פרטיות ומחיקת חשבון",
    },
    {
      Icon: Handshake,
      title: "שיתוף פעולה",
      desc: "עסקי, שיווקי או אחר",
      subject: "שיתוף פעולה",
    },
  ],
  en: [
    {
      Icon: AlertTriangle,
      title: "Bug Report",
      desc: "Something isn't working as expected",
      subject: "Bug Report",
    },
    {
      Icon: Lightbulb,
      title: "Feature Request",
      desc: "You have an idea that would improve the app",
      subject: "Feature Request",
    },
    {
      Icon: ShieldCheck,
      title: "Privacy & Account Deletion",
      desc: "Request to delete your data or privacy questions",
      subject: "Privacy & Account Deletion",
    },
    {
      Icon: Handshake,
      title: "Partnership",
      desc: "Business, marketing or other inquiries",
      subject: "Partnership Inquiry",
    },
  ],
};

export default function ContactPage() {
  const { user, firebaseUser } = useAuth();
  const { lang, dir } = useLanguage();
  const [copied, setCopied] = useState(false);

  const isAuthed = !!firebaseUser;
  const categories = CATEGORIES[lang as "he" | "en"] ?? CATEGORIES.he;

  const isHe = lang === "he";
  const title = isHe ? "צור קשר" : "Contact Us";
  const subtitle = isHe
    ? "שמחים לשמוע ממך — שאלות, בעיות, רעיונות או כל דבר אחר."
    : "We'd love to hear from you — questions, issues, ideas, or anything else.";
  const responseLabel = isHe ? "זמן תגובה ממוצע: עד 48 שעות" : "Average response time: up to 48 hours";
  const copyLabel = isHe ? "העתקת כתובת" : "Copied!";
  const backLabel = isHe
    ? isAuthed ? "חזרה לאפליקציה" : "חזרה להתחברות"
    : isAuthed ? "Back to app" : "Back to login";

  function copyEmail() {
    navigator.clipboard.writeText(CONTACT_EMAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-wing-bg" dir={dir}>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-2 pt-2">
          <Mail size={22} className="text-wing-heat" strokeWidth={2.5} />
          <h1 className="text-2xl font-black text-wing-ink tracking-tight">{title}</h1>
        </div>
        <p className="text-sm text-wing-muted -mt-2">{subtitle}</p>

        {/* Email + copy */}
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold mb-3">
            {isHe ? "כתובת מייל" : "Email address"}
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-wing-ink" dir="ltr">{CONTACT_EMAIL}</span>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-wing-border bg-wing-elevated text-xs font-semibold text-wing-ink transition-colors hover:border-wing-ink active:scale-95"
            >
              {copied
                ? <><Check size={13} className="text-green-500" /> {copyLabel}</>
                : <><Copy size={13} /> {isHe ? "העתק" : "Copy"}</>
              }
            </button>
          </div>
          <p className="text-xs text-wing-muted mt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {responseLabel}
          </p>
        </div>

        {/* Category cards */}
        <div className="space-y-2">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold px-1">
            {isHe ? "במה נוכל לעזור?" : "How can we help?"}
          </p>
          {categories.map(({ Icon, title: catTitle, desc, subject }) => (
            <a
              key={subject}
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}
              className="flex items-center gap-4 bg-wing-surface border border-wing-border rounded-[20px] px-5 py-4 hover:border-wing-ink transition-colors group active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-2xl bg-wing-elevated border border-wing-border flex items-center justify-center flex-shrink-0 group-hover:bg-wing-ink group-hover:border-wing-ink transition-colors">
                <Icon size={18} className="text-wing-muted group-hover:text-wing-elevated transition-colors" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-wing-ink">{catTitle}</p>
                <p className="text-xs text-wing-muted mt-0.5">{desc}</p>
              </div>
              <ChevronRight
                size={16}
                className={`text-wing-subtle group-hover:text-wing-ink transition-colors flex-shrink-0 ${isHe ? "rotate-180" : ""}`}
              />
            </a>
          ))}
        </div>

        {/* Back link */}
        <Link
          href={isAuthed ? "/dashboard" : "/login"}
          className="flex items-center justify-center gap-1 text-sm text-wing-muted py-2"
        >
          <ChevronRight size={14} className={isHe ? "" : "rotate-180"} />
          {backLabel}
        </Link>

      </div>
    </div>
  );
}
