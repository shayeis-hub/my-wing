"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
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
      toast.success(notified > 0 ? `שלחנו סימן ל-${notified} חברים 💪` : "שלחנו סימן!");
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
      className="flex items-center justify-center gap-2.5 w-full bg-white rounded-[14px] py-4 active:scale-[0.97] transition-all disabled:opacity-60"
      style={{ border: "1.5px solid #ff6b47" }}
    >
      <AlertTriangle size={20} strokeWidth={2} style={{ color: "#ff6b47" }} />
      <span className="font-bold text-base" style={{ color: "#ff6b47" }}>
        {cooldown ? "נשלח ✓" : sending ? "שולח..." : "SOS – צריך חיזוק!"}
      </span>
    </button>
  );
}
