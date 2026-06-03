"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/i18n";

interface SOSButtonProps {
  wingId: string;
  userId: string;
  userName: string;
}

export function SOSButton({ wingId, userId, userName }: SOSButtonProps) {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { t, lang } = useLanguage();

  async function handleSOS() {
    if (sending || cooldown) return;
    setSending(true);
    try {
      const res = await fetch("/api/notifications/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wingId, userId, userName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(`Error: ${data.error ?? res.status}`);
        return;
      }
      const notified: number = data.notified ?? 0;
      toast.success((t("sos_success") as (n: number) => string)(notified));
      setCooldown(true);
      setTimeout(() => setCooldown(false), 10 * 60 * 1000);
    } catch {
      toast.error(t("sos_error") as string);
    } finally {
      setSending(false);
    }
  }

  const label = cooldown
    ? t("sos_sent") as string
    : sending
    ? t("sos_sending") as string
    : t("sos_btn") as string;

  return (
    <>
      <button
        onClick={() => !cooldown && !sending && setShowConfirm(true)}
        disabled={sending || cooldown}
        className="flex items-center justify-center gap-2.5 w-full bg-white rounded-[14px] py-4 active:scale-[0.97] transition-all disabled:opacity-60"
        style={{ border: "1.5px solid #ff6b47" }}
      >
        <AlertTriangle size={20} strokeWidth={2} style={{ color: "#ff6b47" }} />
        <span className="font-bold text-base" style={{ color: "#ff6b47" }}>
          {label}
        </span>
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-wing-surface rounded-[20px] p-6 max-w-sm w-full space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} style={{ color: "#ff6b47" }} />
              </div>
              <h3 className="font-black text-wing-ink text-lg">
                {lang === "he" ? "שליחת SOS" : "Send SOS"}
              </h3>
            </div>
            <p className="text-sm text-wing-muted leading-relaxed">
              {lang === "he"
                ? "לחיצה תשלח הודעה לכלל חברי הכנף. אתה בטוח?"
                : "This will send a notification to all wing members. Are you sure?"}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-2xl border border-wing-border text-sm font-medium text-wing-muted hover:bg-wing-elevated transition-colors"
              >
                {lang === "he" ? "ביטול" : "Cancel"}
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSOS(); }}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-colors"
                style={{ background: "#ff6b47" }}
              >
                {lang === "he" ? "שלח SOS" : "Send SOS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
