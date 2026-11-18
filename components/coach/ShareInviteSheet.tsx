"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Share2, X } from "lucide-react";

export interface InviteShare {
  url: string;
  /** "private" = one client; "group" = a shared group. */
  type: "private" | "group";
  /** Client name (private) or group name (group), if known. */
  label?: string;
}

/** Invitation wording; gender-neutral since we don't know the recipient's. */
export function inviteMessage(share: InviteShare, coachName: string): { subject: string; text: string } {
  const from = coachName ? ` מ${coachName}` : "";
  if (share.type === "group") {
    const group = share.label ? ` "${share.label}"` : "";
    return {
      subject: "הזמנה להצטרף לקבוצה ב\"מבנה כנף\"",
      text: `היי! הנה הזמנה${from} להצטרף לקבוצה${group} ב"מבנה כנף": ${share.url}`,
    };
  }
  const hi = share.label ? `היי ${share.label}!` : "היי!";
  return {
    subject: "הזמנה ל\"מבנה כנף\"",
    text: `${hi} הנה הזמנה${from} להצטרף ל"מבנה כנף" ולקבל ליווי אישי: ${share.url}`,
  };
}

export function ShareInviteSheet({ share, coachName, lang, onClose }: { share: InviteShare; coachName: string; lang: "he" | "en"; onClose: () => void }) {
  const he = lang === "he";
  const [copied, setCopied] = useState(false);
  const { subject, text } = inviteMessage(share, coachName);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const actions = [
    { id: "wa", icon: MessageCircle, label: "WhatsApp", run: () => open(`https://wa.me/?text=${encodeURIComponent(text)}`) },
    { id: "mail", icon: Mail, label: he ? "מייל" : "Email", run: () => { window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`; } },
    ...(canNativeShare ? [{ id: "share", icon: Share2, label: he ? "אפליקציות אחרות" : "More apps", run: () => { navigator.share({ title: subject, text }).catch(() => {}); } }] : []),
    {
      id: "copy",
      icon: copied ? Check : Copy,
      label: copied ? (he ? "הועתק" : "Copied") : he ? "העתקת קישור" : "Copy link",
      run: () => { navigator.clipboard.writeText(share.url); setCopied(true); setTimeout(() => setCopied(false), 1500); },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30" onClick={onClose} dir={he ? "rtl" : "ltr"}>
      <div className="bg-wing-bg rounded-t-[24px] p-4 space-y-3" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-wing-ink">{he ? "שליחת הקישור ללקוח" : "Send the invite link"}</p>
          <button onClick={onClose} aria-label={he ? "סגירה" : "Close"} className="p-1 text-wing-muted"><X size={18} /></button>
        </div>
        <p className="text-xs text-wing-muted leading-relaxed bg-wing-elevated border border-wing-border rounded-xl px-3 py-2">{text}</p>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <button key={a.id} onClick={a.run} className="flex items-center justify-center gap-2 rounded-2xl py-3 border bg-wing-surface border-wing-border text-wing-ink text-sm font-bold active:scale-[0.98] transition-transform">
              <a.icon size={17} />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
