"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import { MealCard } from "@/components/meals/MealCard";
import {
  getTodayCheckin,
  getMemberRecentMeals,
  getWallMessages,
  addWallMessage,
  deleteWallMessage,
  type WallMessage,
} from "@/lib/firebase/firestore";
import { format } from "date-fns";
import { he, enUS } from "date-fns/locale";
import toast from "react-hot-toast";
import type { DailyCheckin, Meal } from "@/types";
import { Droplets, Leaf, Footprints, Scale, Dumbbell, ArrowRight, Send, Trash2 } from "lucide-react";

const MOOD_EMOJIS = ["😞", "😕", "😐", "😊", "🤩"];

function MemberPageInner() {
  const { uid } = useParams<{ uid: string }>();
  const { user, firebaseUser } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // A coach viewing a client passes ?wing=<id>; otherwise use the active wing.
  const effectiveWingId = searchParams.get("wing") ?? user?.wingId;
  const { wing } = useWing(effectiveWingId);

  const member = wing?.members.find((m) => m.uid === uid);
  const isSelf = !!firebaseUser && firebaseUser.uid === uid;
  const today = format(new Date(), "yyyy-MM-dd");

  const [checkin, setCheckin] = useState<DailyCheckin | null | undefined>(undefined);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [wallMsgs, setWallMsgs] = useState<WallMessage[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveWingId || !uid) return;
    getTodayCheckin(effectiveWingId, uid, today).then(setCheckin);
    getMemberRecentMeals(effectiveWingId, uid).then(setMeals);
    getWallMessages(effectiveWingId, uid).then(setWallMsgs);
  }, [effectiveWingId, uid, today]);

  async function handleSendMessage() {
    const text = msgText.trim();
    if (!text || !effectiveWingId || !firebaseUser || !uid) return;
    setSending(true);
    try {
      const msgData = {
        wingId: effectiveWingId,
        targetUserId: uid,
        authorId: firebaseUser.uid,
        authorName: user!.displayName,
        text,
      };
      await addWallMessage(effectiveWingId, msgData);
      await fetch("/api/notifications/wall-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...msgData, message: text }),
      });
      setWallMsgs((prev) => [
        { ...msgData, id: String(Date.now()), createdAt: null as unknown as WallMessage["createdAt"] },
        ...prev,
      ]);
      setMsgText("");
      toast.success(lang === "he" ? "ההודעה נשלחה!" : "Message sent!");
    } catch {
      toast.error(lang === "he" ? "שגיאה בשליחה" : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(msgId: string) {
    if (!effectiveWingId) return;
    const prev = wallMsgs;
    setWallMsgs((list) => list.filter((m) => m.id !== msgId));
    setConfirmDelete(null);
    try {
      await deleteWallMessage(effectiveWingId, msgId);
    } catch {
      setWallMsgs(prev);
      toast.error(lang === "he" ? "שגיאה במחיקה" : "Failed to delete");
    }
  }

  const memberFirstName = member?.displayName?.split(" ")[0] ?? "";

  function formatMsgTime(msg: WallMessage): string {
    const d = msg.createdAt?.toDate?.();
    if (!d) return lang === "he" ? "עכשיו" : "now";
    return format(d, "d MMM, HH:mm", { locale: lang === "he" ? he : enUS });
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-wing-elevated border border-wing-border shrink-0"
        >
          <ArrowRight size={18} className="text-wing-ink" />
        </button>
        <Avatar name={member?.displayName ?? uid} photoURL={member?.photoURL} size={44} className="shrink-0" />
        <div className="min-w-0">
          <h1 className="font-bold text-wing-ink text-lg truncate">
            {isSelf ? (lang === "he" ? "הקיר שלי" : "My wall") : (member?.displayName ?? "—")}
          </h1>
          <p className="text-xs text-wing-muted">
            {isSelf ? (lang === "he" ? "מה שכתבו לך" : "Messages for you") : (lang === "he" ? "חבר/ת הכנף" : "Wing member")}
          </p>
        </div>
      </div>

      {/* Today's check-in */}
      {checkin === undefined ? (
        <div className="h-28 bg-wing-elevated border border-wing-border rounded-[20px] animate-pulse" />
      ) : checkin === null ? (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 text-center">
          <p className="text-wing-muted text-sm">
            {lang === "he"
              ? `${memberFirstName} עוד לא עשה/תה צ'ק-אפ היום`
              : `${memberFirstName} hasn't checked in today`}
          </p>
        </div>
      ) : (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-wing-muted">
            {lang === "he" ? "צ'ק-אפ היום" : "Today's check-in"}
          </p>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
              <Droplets size={14} className="mx-auto text-blue-400 mb-1" />
              <p className="font-black text-wing-ink text-sm tabular">
                {checkin.waterGlasses.toFixed(1)}L
              </p>
            </div>
            <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
              <Leaf size={14} className="mx-auto text-green-500 mb-1" />
              <p className="font-black text-wing-ink text-sm tabular">{checkin.vegetablesServings}</p>
            </div>
            <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
              <Footprints size={14} className="mx-auto text-wing-muted mb-1" />
              <p className="font-black text-wing-ink text-sm tabular">
                {checkin.steps
                  ? checkin.steps >= 1000
                    ? `${(checkin.steps / 1000).toFixed(1)}k`
                    : checkin.steps
                  : "—"}
              </p>
            </div>
            <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
              <p className="text-xl leading-none mt-0.5">
                {MOOD_EMOJIS[(checkin.mood ?? 3) - 1]}
              </p>
            </div>
          </div>
          {checkin.weightKg && (
            <div className="flex items-center gap-2 text-sm text-wing-muted">
              <Scale size={13} /> {checkin.weightKg} kg
            </div>
          )}
          {checkin.workout?.done && (
            <div className="flex items-center gap-2 text-sm text-wing-muted">
              <Dumbbell size={13} />
              {checkin.workout.description || (lang === "he" ? "אימון" : "Workout")}
            </div>
          )}
          {checkin.notes && (
            <p className="text-sm text-wing-muted italic bg-wing-elevated border border-wing-border rounded-2xl px-4 py-2.5">
              &ldquo;{checkin.notes}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Write on wall */}
      <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
        <h3 className="font-bold text-wing-ink text-sm">
          {isSelf
            ? (lang === "he" ? "הודעות שקיבלת" : "Messages you received")
            : (lang === "he" ? `כתוב/י ל${memberFirstName}` : `Write to ${memberFirstName}`)}
        </h3>

        {isSelf && wallMsgs.length === 0 && (
          <p className="text-sm text-wing-muted text-center py-2">
            {lang === "he" ? "עדיין לא קיבלת הודעות על הקיר" : "No wall messages yet"}
          </p>
        )}

        {wallMsgs.length > 0 && (
          <div className="space-y-2 max-h-[228px] overflow-y-auto pr-0.5">
            {wallMsgs.map((msg) => {
              const canDelete =
                msg.authorId === firebaseUser?.uid || firebaseUser?.uid === uid;
              return (
                <div key={msg.id} className="bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="font-bold text-wing-ink">{msg.authorName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-wing-subtle tabular">{formatMsgTime(msg)}</span>
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete(confirmDelete === msg.id ? null : msg.id)}
                          className="text-wing-subtle hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="text-wing-muted">{msg.text}</span>
                  {confirmDelete === msg.id && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-1 rounded-xl text-xs border border-wing-border text-wing-muted"
                      >
                        {lang === "he" ? "ביטול" : "Cancel"}
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="flex-1 py-1 rounded-xl text-xs bg-red-500 text-white font-bold"
                      >
                        {lang === "he" ? "מחק" : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isSelf && (
          <div className="flex gap-2">
            <input
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
              placeholder={
                lang === "he"
                  ? `עודד/י את ${memberFirstName}, שאל/י מה קורה...`
                  : `Encourage ${memberFirstName}, ask how it's going...`
              }
              className="flex-1 text-sm border border-wing-border rounded-2xl px-3 py-2.5 bg-wing-elevated focus:outline-none focus:ring-2 focus:ring-wing-ink text-wing-ink placeholder:text-wing-subtle"
              dir={lang === "he" ? "rtl" : "ltr"}
            />
            <button
              onClick={handleSendMessage}
              disabled={!msgText.trim() || sending}
              className="px-4 py-2.5 rounded-2xl bg-wing-ink text-wing-elevated disabled:opacity-40 active:scale-95 transition-transform"
            >
              <Send size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Recent meals */}
      <div className="space-y-3">
        <h3 className="font-bold text-wing-ink">
          {lang === "he" ? "ארוחות אחרונות" : "Recent meals"}
        </h3>
        {meals.length === 0 ? (
          <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 text-center">
            <p className="text-wing-muted text-sm">
              {lang === "he" ? "אין ארוחות רשומות" : "No meals logged"}
            </p>
          </div>
        ) : (
          meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              currentUserId={firebaseUser?.uid ?? ""}
              currentUserName={user?.displayName ?? ""}
              isViewerAdmin={false}
            />
          ))
        )}
      </div>

      <div className="pb-4" />
    </div>
  );
}

export default function MemberPage() {
  return (
    <Suspense fallback={<div className="p-4" />}>
      <MemberPageInner />
    </Suspense>
  );
}
