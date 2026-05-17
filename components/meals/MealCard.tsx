"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { addMealComment } from "@/lib/firebase/firestore";
import type { Meal, Encouragement } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import toast from "react-hot-toast";

interface MealCardProps {
  meal: Meal;
  currentUserId?: string;
  currentUserName?: string;
}

const mealTypeLabels: Record<Meal["mealType"], string> = {
  breakfast: "ארוחת בוקר",
  lunch: "ארוחת צהריים",
  dinner: "ארוחת ערב",
  snack: "חטיף",
};

export function MealCard({ meal, currentUserId, currentUserName }: MealCardProps) {
  const [comments, setComments] = useState<Encouragement[]>(meal.comments ?? []);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const timeAgo = meal.createdAt?.toDate
    ? formatDistanceToNow(meal.createdAt.toDate(), { addSuffix: true, locale: he })
    : "";

  const isOwn = currentUserId === meal.userId;

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !currentUserId || !currentUserName) return;
    setSending(true);
    try {
      const comment: Encouragement = {
        authorId: currentUserId,
        authorName: currentUserName,
        text: trimmed,
        createdAt: Date.now(),
      };
      await addMealComment(meal.wingId, meal.id, comment);
      await fetch("/api/notifications/encouragement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: meal.userId,
          authorName: currentUserName,
          message: trimmed,
        }),
      });
      setComments((prev) => [...prev, comment]);
      setText("");
      setShowComments(true);
      toast.success("התגובה נשלחה! 💬");
    } catch {
      toast.error("שגיאה בשליחה");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <div className="flex gap-3">
        {meal.imageURL && (
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
            <Image src={meal.imageURL} alt={meal.analysis.description} fill className="object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-slate-800 truncate">{meal.userName}</p>
              <p className="text-xs text-wing-muted">{mealTypeLabels[meal.mealType]} · {timeAgo}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="font-bold text-wing-primary text-sm">{meal.analysis.calories}</span>
              <span className="text-xs text-slate-400"> קק&quot;ל</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{meal.analysis.description}</p>
          <div className="flex gap-3 mt-2">
            {[
              { label: "חלבון", value: meal.analysis.protein },
              { label: "פחמ׳", value: meal.analysis.carbs },
              { label: "שומן", value: meal.analysis.fat },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xs font-semibold text-slate-700">{value}g</p>
                <p className="text-[10px] text-slate-400">{label}</p>
              </div>
            ))}
            <div className="mr-auto">
              <div className="flex items-center gap-0.5">
                {"⭐".repeat(Math.round(meal.analysis.healthScore / 2))}
              </div>
              <p className="text-[10px] text-slate-400">ציון בריאות</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {(comments.length > 0 || currentUserId) && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {comments.length > 0 && (
            <button onClick={() => setShowComments((v) => !v)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              💬 {comments.length} תגובה{comments.length > 1 ? "ות" : ""} {showComments ? "▲" : "▼"}
            </button>
          )}
          {showComments && comments.map((c, i) => (
            <div key={i} className="text-xs bg-wing-soft rounded-xl px-3 py-1.5">
              <span className="font-medium text-wing-primary">{c.authorName}: </span>
              <span className="text-slate-600">{c.text}</span>
            </div>
          ))}
          {currentUserId && (isOwn ? comments.length > 0 : true) && (
            <div className="flex gap-2">
              <input type="text" value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isOwn ? "הגב / תודה על העידוד..." : `עודד את ${meal.userName}...`}
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-wing-primary bg-slate-50"
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              />
              <Button size="sm" onClick={handleSend} loading={sending} disabled={!text.trim()}>
                שלח
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
