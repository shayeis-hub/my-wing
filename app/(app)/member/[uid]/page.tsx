"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  type WallMessage,
} from "@/lib/firebase/firestore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { DailyCheckin, Meal } from "@/types";
import { Droplets, Leaf, Footprints, Scale, Dumbbell, ArrowRight, Send } from "lucide-react";

const MOOD_EMOJIS = ["😞", "😕", "😐", "😊", "🤩"];

export default function MemberPage() {
  const { uid } = useParams<{ uid: string }>();
  const { user, firebaseUser } = useAuth();
  const { wing } = useWing(user?.wingId);
  const { lang } = useLanguage();
  const router = useRouter();

  const member = wing?.members.find((m) => m.uid === uid);
  const today = format(new Date(), "yyyy-MM-dd");

  const [checkin, setCheckin] = useState<DailyCheckin | null | undefined>(undefined);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [wallMsgs, setWallMsgs] = useState<WallMessage[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user?.wingId || !uid) return;
    getTodayCheckin(user.wingId, uid, today).then(setCheckin);
    getMemberRecentMeals(user.wingId, uid).then(setMeals);
    getWallMessages(user.wingId, uid).then(setWallMsgs);
  }, [user?.wingId, uid, today]);

  async function handleSendMessage() {
    const text = msgText.trim();
    if (!text || !user?.wingId || !firebaseUser || !uid) return;
    setSending(true);
    try {
      const msgData = {
        wingId: user.wingId,
        targetUserId: uid,
        authorId: firebaseUser.uid,
        authorName: user.displayName,
        text,
      };
      await addWallMessage(user.wingId, msgData);
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

  const memberFirstName = member?.displayName?.split(" ")[0] ?? "";

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
          <h1 className="font-bold text-wing-ink text-lg truncate">{member?.displayName ?? "—"}</h1>
          <p className="text-xs text-wing-muted">{lang === "he" ? "חבר/ת הכנף" : "Wing member"}</p>
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
          {lang === "he"
            ? `כתוב/י ל${memberFirstName}`
            : `Write to ${memberFirstName}`}
        </h3>

        {wallMsgs.slice(0, 5).map((msg) => (
          <div key={msg.id} className="bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5 text-sm">
            <span className="font-bold text-wing-ink">{msg.authorName}: </span>
            <span className="text-wing-muted">{msg.text}</span>
          </div>
        ))}

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
            dir="rtl"
          />
          <button
            onClick={handleSendMessage}
            disabled={!msgText.trim() || sending}
            className="px-4 py-2.5 rounded-2xl bg-wing-ink text-wing-elevated disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Send size={16} />
          </button>
        </div>
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
