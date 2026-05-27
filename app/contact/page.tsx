"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Mail, AlertTriangle, Lightbulb, MessageSquare, ChevronRight, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

type Subject = "bug" | "idea" | "other";

export default function ContactPage() {
  const { user, firebaseUser } = useAuth();
  const { t, lang, dir } = useLanguage();
  const router = useRouter();

  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(firebaseUser?.email ?? user?.email ?? "");
  const [subject, setSubject] = useState<Subject>("idea");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAuthed = !!firebaseUser;

  // Sync state with auth user once it loads
  if (isAuthed && !name && user?.displayName) setName(user.displayName);
  if (isAuthed && !email && (firebaseUser?.email || user?.email)) setEmail(firebaseUser?.email ?? user?.email ?? "");

  const subjectOptions: { value: Subject; label: string; Icon: typeof AlertTriangle }[] = [
    { value: "bug",   label: t("contact_subject_bug") as string,   Icon: AlertTriangle },
    { value: "idea",  label: t("contact_subject_idea") as string,  Icon: Lightbulb },
    { value: "other", label: t("contact_subject_other") as string, Icon: MessageSquare },
  ];

  async function handleSubmit() {
    if (!message.trim() || !name.trim() || !email.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
          userId: firebaseUser?.uid,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      toast.success(t("contact_sent") as string);
      setMessage("");
      setTimeout(() => router.push(isAuthed ? "/dashboard" : "/login"), 800);
    } catch {
      toast.error(t("contact_error") as string);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim() && email.trim() && message.trim() && !submitting;

  return (
    <div className="min-h-screen bg-wing-bg p-4" dir={dir}>
      <div className="max-w-lg mx-auto space-y-4">
        <div className="pt-4 flex items-center gap-2">
          <Mail size={22} className="text-wing-heat" strokeWidth={2.5} />
          <h1 className="text-2xl font-black text-wing-ink tracking-tight">{t("contact_title") as string}</h1>
        </div>

        <p className="text-sm text-wing-muted">{t("contact_subtitle") as string}</p>

        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold">
              {t("contact_name") as string}
            </label>
            {isAuthed && user?.displayName ? (
              <div className="mt-1.5 bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3 text-sm text-wing-ink">
                {name || "—"}
              </div>
            ) : (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("contact_name") as string}
                className="mt-1.5 w-full bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3 text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
              />
            )}
          </div>

          {/* Email */}
          <div>
            <label className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold">
              {t("contact_email") as string}
            </label>
            {isAuthed && (firebaseUser?.email || user?.email) ? (
              <div className="mt-1.5 bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3 text-sm text-wing-ink" dir="ltr" style={{ textAlign: lang === "he" ? "right" : "left" }}>
                {email || "—"}
              </div>
            ) : (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("contact_email") as string}
                dir="ltr"
                className="mt-1.5 w-full bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3 text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
              />
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold">
              {t("contact_subject_label") as string}
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {subjectOptions.map(({ value, label, Icon }) => {
                const active = subject === value;
                return (
                  <button
                    key={value}
                    onClick={() => setSubject(value)}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-[14px] border-2 transition-all active:scale-95 ${
                      active
                        ? "border-wing-ink bg-wing-elevated"
                        : "border-wing-border bg-wing-elevated/50"
                    }`}
                  >
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.5 : 2}
                      className={active ? "text-wing-heat" : "text-wing-muted"}
                    />
                    <span className={`text-xs text-center leading-tight ${active ? "font-bold text-wing-ink" : "text-wing-muted"}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted font-bold">
              {t("contact_message_label") as string}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("contact_message_ph") as string}
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
            {submitting ? t("contact_sending") as string : t("contact_submit") as string}
          </Button>
        </div>

        <Link href={isAuthed ? "/dashboard" : "/login"} className="flex items-center justify-center gap-1 text-sm text-wing-muted py-2">
          <ChevronRight size={14} />
          {isAuthed ? t("contact_back") as string : (lang === "he" ? "חזרה להתחברות" : "Back to login")}
        </Link>
      </div>
    </div>
  );
}
