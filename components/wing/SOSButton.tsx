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
  const { t } = useLanguage();

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
    <button
      onClick={handleSOS}
      disabled={sending || cooldown}
      className="flex items-center justify-center gap-2.5 w-full bg-white rounded-[14px] py-4 active:scale-[0.97] transition-all disabled:opacity-60"
      style={{ border: "1.5px solid #ff6b47" }}
    >
      <AlertTriangle size={20} strokeWidth={2} style={{ color: "#ff6b47" }} />
      <span className="font-bold text-base" style={{ color: "#ff6b47" }}>
        {label}
      </span>
    </button>
  );
}
