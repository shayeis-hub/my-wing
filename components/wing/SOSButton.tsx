"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface SOSButtonProps {
  wingId: string;
  userId: string;
  userName: string;
}

export function SOSButton({ wingId, userId, userName }: SOSButtonProps) {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);

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
        toast.error(`שגיאה: ${data.error ?? res.status}`);
        return;
      }
      const notified: number = data.notified ?? 0;
      toast.success(notified > 0 ? `שלחנו סימן ל-${notified} חברים 💪` : "שלחנו סימן! (לא נמצאו טוקנים רשומים)");
      setCooldown(true);
      setTimeout(() => setCooldown(false), 10 * 60 * 1000);
    } catch {
      toast.error("לא הצלחנו לשלוח. נסה שוב.");
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={handleSOS}
      disabled={sending || cooldown}
      className="
        flex flex-col items-center justify-center gap-2
        w-full bg-gradient-to-br from-red-400 to-red-500
        text-white rounded-3xl py-5 shadow-lg
        active:scale-95 transition-all
        disabled:opacity-60 disabled:cursor-not-allowed
      "
    >
      <AlertCircle size={32} strokeWidth={2} />
      <span className="font-bold text-lg">
        {cooldown ? "נשלח ✓" : sending ? "שולח..." : "SOS – צריך חיזוק!"}
      </span>
      <span className="text-xs text-red-100">
        יישלח התראה לכל חברי המבנה
      </span>
    </button>
  );
}
