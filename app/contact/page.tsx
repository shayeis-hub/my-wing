"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import {
  Mail, AlertTriangle, Lightbulb, ShieldCheck, Handshake,
  Copy, Check, ChevronRight, Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

const CONTACT_EMAIL = "contact@wingpact.app";
type Subject = "bug" | "idea" | "privacy" | "partnership" | "other";

interface Category {
  value: Subject;
  Icon: typeof AlertTriangle;
  title: string;
  desc: string;
}

const CATEGORIES: Record<"he" | "en", Category[]> = {
  he: [
    { value: "bug",         Icon: AlertTriangle, title: "דיווח על תקלה",          desc: "משהו לא עובד כמו שצריך" },
    { value: "idea",        Icon: Lightbulb,     title: "רעיון לפיצ׳ר",           desc: "יש לך רעיון שישפר את האפליקציה" },
    { value: "privacy",     Icon: ShieldCheck,   title: "פרטיות ומחיקת חשבון",    desc: "בקשה למחיקת נתוניך או שאלות פרטיות" },
    { value: "partnership", Icon: Handshake,     title: "שיתוף פעולה",             desc: "עסקי, שיווקי או אחר" },
  ],
  en: [
    { value: "bug",         Icon: AlertTriangle, title: "Bug Report",              desc: "Something isn't working as expected" },
    { value: "idea",        Icon: Lightbulb,     title: "Feature Request",         desc: "You have an idea that would improve the app" },
    { value: "privacy",     Icon: ShieldCheck,   title: "Privacy & Account",       desc: "Request to delete your data or privacy questions" },
    { value: "partnership", Icon: Handshake,     title: "Partnership",             desc: "Business, marketing or other inquiries" },
  ],
};

const SUBJECT_API_MAP: Record<Subject, "bug" | "idea" | "other"> = {
  bug: "bug",
  idea: "idea",
  privacy: "other",
  partnership: "other",
  other: "other",
};

export default function ContactPage() {
  const { user, firebaseUser } = useAuth();
  const { lang, dir } = useLanguage();
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Subject | null>(null);
  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(firebaseUser?.email ?? user?.email ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sync auth data once loaded
  if (firebaseUser && !name && user?.displayName) setName(user.displayName);
  if (firebaseUser && !email && (firebaseUser.email || user?.email)) {
    setEmail(firebaseUser.email ?? user?.email ?? "");
  }

  const isAuthed = !!firebaseUser;
  const isHe = lang === "he";
  const categories = CATEGORIES[isHe ? "he" : "en"];

  function selectCategory(value: Subject) {
    setSelectedCategory(value);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function copyEmail() {
    navigator.clipboard.writeText(CONTACT_EMAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSubmit() {
    if (!message.trim() || !name.trim() || !email.trim() || !selectedCategory || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: SUBJECT_API_MAP[selectedCategory],
          message: message.trim(),
          userId: firebaseUser?.uid,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      toast.success(isHe ? "ההודעה נשלחה!" : "Message sent!");
      setMessage("");
      setSelectedCategory(null);
      setTimeout(() => router.push(isAuthed ? "/dashboard" : "/"), 800);
    } catch {
      toast.error(isHe ? "שגיאה בשליחה. נסה שוב." : "Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim() && email.trim() && message.trim() && selectedCategory && !submitting;

  // ── labels ──
  const T = {
    title:          isHe ? "צור קשר"                   : "Contact Us",
    subtitle:       isHe ? "שמחים לשמוע ממך — שאלות, בעיות, רעיונות או כל דבר אחר." : "We'd love to hear from you — questions, issues, ideas, or anything else.",
    emailLabel:     isHe ? "כתובת מייל"                : "Email address",
    responseLabel:  isHe ? "זמן תגובה ממוצע: עד 48 שעות" : "Average response time: up to 48 hours",
    copy:           isHe ? "העתק"                       : "Copy",
    copied:         isHe ? "הועתק!"                     : "Copied!",
    howHelp:        isHe ? "במה נוכל לעזור?"            : "How can we help?",
    formTitle:      isHe ? "שלח הודעה"                  : "Send a message",
    nameLabel:      isHe ? "שם"                         : "Name",
    emailFieldLabel:isHe ? "מייל"                       : "Email",
    msgLabel:       isHe ? "הודעה"                      : "Message",
    msgPh:          isHe ? "ספר לנו יותר..."            : "Tell us more...",
    submit:         isHe ? "שלח"                        : "Send",
    sending:        isHe ? "שולח..."                    : "Sending...",
    back:           isAuthed
                      ? (isHe ? "חזרה לאפליקציה" : "Back to app")
                      : (isHe ? "חזרה לדף הבית"  : "Back to home"),
    backHref:       isAuthed ? "/dashboard" : "/",
  };

  return (
    <div className="min-h-screen bg-wing-bg" dir={dir}>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-2 pt-2">
          <Mail size={22} className="text-wing-heat" strokeWidth={2.5} />
          <h1 className="text-2xl font-black text-wing-ink tracking-tight">{T.title}</h1>
        </div>
        <p className="text-sm text-wing-muted -mt-2">{T.subtitle}</p>

        {/* ── Email card ── */}
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold mb-3">
            {T.emailLabel}
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-wing-ink" dir="ltr">{CONTACT_EMAIL}</span>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-wing-border bg-wing-elevated text-xs font-semibold text-wing-ink transition-colors hover:border-wing-ink active:scale-95"
            >
              {copied
                ? <><Check size={13} className="text-green-500" />{T.copied}</>
                : <><Copy size={13} />{T.copy}</>}
            </button>
          </div>
          <p className="text-xs text-wing-muted mt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block flex-shrink-0" />
            {T.responseLabel}
          </p>
        </div>

        {/* ── Category cards ── */}
        <div className="space-y-2">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold px-1">
            {T.howHelp}
          </p>
          {categories.map(({ value, Icon, title, desc }) => {
            const active = selectedCategory === value;
            return (
              <button
                key={value}
                onClick={() => selectCategory(value)}
                className={`w-full flex items-center gap-4 rounded-[20px] px-5 py-4 border-2 transition-all active:scale-[0.99] text-${dir === "rtl" ? "right" : "left"} ${
                  active
                    ? "bg-wing-elevated border-wing-ink"
                    : "bg-wing-surface border-wing-border hover:border-wing-ink/40"
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  active ? "bg-wing-ink" : "bg-wing-elevated border border-wing-border"
                }`}>
                  <Icon size={18} strokeWidth={2} className={active ? "text-wing-elevated" : "text-wing-muted"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${active ? "text-wing-ink" : "text-wing-ink"}`}>{title}</p>
                  <p className="text-xs text-wing-muted mt-0.5">{desc}</p>
                </div>
                <ChevronRight
                  size={16}
                  className={`flex-shrink-0 transition-colors ${active ? "text-wing-ink" : "text-wing-subtle"} ${isHe ? "rotate-180" : ""}`}
                />
              </button>
            );
          })}
        </div>

        {/* ── Form (appears when category selected) ── */}
        {selectedCategory && (
          <div ref={formRef} className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-4">
            <p className="font-bold text-wing-ink">{T.formTitle}</p>

            {/* Name */}
            <div>
              <label className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold">
                {T.nameLabel}
              </label>
              {isAuthed && user?.displayName ? (
                <div className="mt-1.5 bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3 text-sm text-wing-ink">
                  {name}
                </div>
              ) : (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={T.nameLabel}
                  className="mt-1.5 w-full bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3 text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
                />
              )}
            </div>

            {/* Email */}
            <div>
              <label className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold">
                {T.emailFieldLabel}
              </label>
              {isAuthed && (firebaseUser?.email || user?.email) ? (
                <div className="mt-1.5 bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3 text-sm text-wing-ink" dir="ltr">
                  {email}
                </div>
              ) : (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={T.emailFieldLabel}
                  dir="ltr"
                  className="mt-1.5 w-full bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3 text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
                />
              )}
            </div>

            {/* Message */}
            <div>
              <label className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold">
                {T.msgLabel}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={T.msgPh}
                rows={5}
                className="mt-1.5 w-full bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3 text-sm text-wing-ink placeholder:text-wing-subtle resize-none focus:outline-none focus:ring-2 focus:ring-wing-ink transition-all"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2"
            >
              <Send size={15} strokeWidth={2.5} />
              {submitting ? T.sending : T.submit}
            </Button>
          </div>
        )}

        {/* ── Back link ── */}
        <Link href={T.backHref} className="flex items-center justify-center gap-1 text-sm text-wing-muted py-2">
          <ChevronRight size={14} className={isHe ? "" : "rotate-180"} />
          {T.back}
        </Link>

      </div>
    </div>
  );
}
