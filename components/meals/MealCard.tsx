"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { addMealComment, updateMeal } from "@/lib/firebase/firestore";
import type { Meal, Encouragement } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import toast from "react-hot-toast";
import { X, Pencil } from "lucide-react";

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
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: meal.analysis.description,
    calories: meal.analysis.calories,
    protein: meal.analysis.protein,
    carbs: meal.analysis.carbs,
    fat: meal.analysis.fat,
    mealType: meal.mealType,
    mealTime: meal.mealTime ?? "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const timeAgo = meal.createdAt?.toDate
    ? formatDistanceToNow(meal.createdAt.toDate(), { addSuffix: true, locale: he })
    : "";

  const isOwn = currentUserId === meal.userId;

  function openEdit() {
    setEditForm({
      description: meal.analysis.description,
      calories: meal.analysis.calories,
      protein: meal.analysis.protein,
      carbs: meal.analysis.carbs,
      fat: meal.analysis.fat,
      mealType: meal.mealType,
      mealTime: meal.mealTime ?? "",
    });
    setEditing(true);
  }

  async function handleSaveEdit() {
    setSavingEdit(true);
    try {
      await updateMeal(meal.wingId, meal.id, {
        analysis: {
          ...meal.analysis,
          description: editForm.description,
          calories: editForm.calories,
          protein: editForm.protein,
          carbs: editForm.carbs,
          fat: editForm.fat,
        },
        mealType: editForm.mealType,
        mealTime: editForm.mealTime || undefined,
      });
      toast.success("הארוחה עודכנה ✅");
      setEditing(false);
    } catch {
      toast.error("שגיאה בעדכון");
    } finally {
      setSavingEdit(false);
    }
  }

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
    <>
      <Card className="cursor-pointer" onClick={() => setShowModal(true)}>
        <div className="flex gap-3">
          {meal.imageURL && (
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
              <Image src={meal.imageURL} alt={meal.analysis.description} fill className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-base text-slate-800 truncate">{meal.userName}</p>
                <p className="text-sm text-wing-muted">
                  {mealTypeLabels[meal.mealType]}
                  {meal.mealTime && ` · ${meal.mealTime}`}
                  {" · "}{timeAgo}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="font-bold text-wing-primary text-base">{meal.analysis.calories}</span>
                <span className="text-sm text-slate-400"> קק&quot;ל</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{meal.analysis.description}</p>
            <div className="flex gap-3 mt-2">
              {[
                { label: "חלבון", value: meal.analysis.protein },
                { label: "פחמ׳", value: meal.analysis.carbs },
                { label: "שומן", value: meal.analysis.fat },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-sm font-semibold text-slate-700">{value}g</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              ))}
              <div className="mr-auto">
                <div className="flex items-center gap-0.5">
                  {"⭐".repeat(Math.round(meal.analysis.healthScore / 2))}
                </div>
                <p className="text-xs text-slate-400">ציון בריאות</p>
              </div>
            </div>
          </div>
        </div>

        {/* Comments section */}
        {(comments.length > 0 || currentUserId) && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2" onClick={(e) => e.stopPropagation()}>
            {comments.length > 0 && (
              <button onClick={() => setShowComments((v) => !v)}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                💬 {comments.length} תגובה{comments.length > 1 ? "ות" : ""} {showComments ? "▲" : "▼"}
              </button>
            )}
            {showComments && comments.map((c, i) => (
              <div key={i} className="text-sm bg-wing-soft rounded-xl px-3 py-2">
                <span className="font-medium text-wing-primary">{c.authorName}: </span>
                <span className="text-slate-600">{c.text}</span>
              </div>
            ))}
            {currentUserId && (isOwn ? comments.length > 0 : true) && (
              <div className="flex gap-2">
                <input type="text" value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={isOwn ? "הגב / תודה על העידוד..." : `עודד את ${meal.userName}...`}
                  className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wing-primary bg-slate-50"
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

      {/* Detail modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-base text-slate-800">{meal.userName}</p>
                <p className="text-sm text-slate-400">
                  {mealTypeLabels[meal.mealType]}
                  {meal.mealTime && ` · ${meal.mealTime}`}
                  {" · "}{timeAgo}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {isOwn && !editing && (
                  <button onClick={openEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                    <Pencil size={18} />
                  </button>
                )}
                <button onClick={() => { setShowModal(false); setEditing(false); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X size={20} />
                </button>
              </div>
            </div>

            {editing ? (
              <div className="p-5 space-y-3">
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="תיאור הארוחה"
                  className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wing-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["calories", "🔥 קק\"ל"],
                    ["protein", "🥩 חלבון g"],
                    ["carbs", "🌾 פחמימות g"],
                    ["fat", "🧈 שומן g"],
                  ] as [keyof typeof editForm, string][]).map(([field, label]) => (
                    <label key={field} className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-400">{label}</span>
                      <input
                        type="number"
                        value={editForm[field] as number}
                        onChange={(e) => setEditForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                        className="border border-slate-200 rounded-xl px-2 py-1.5 text-sm w-full"
                        inputMode="numeric"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={editForm.mealType}
                    onChange={(e) => setEditForm((f) => ({ ...f, mealType: e.target.value as Meal["mealType"] }))}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none"
                  >
                    {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
                      <option key={t} value={t}>{mealTypeLabels[t]}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={editForm.mealTime}
                    onChange={(e) => setEditForm((f) => ({ ...f, mealTime: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none w-28"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1">בטל</Button>
                  <Button onClick={handleSaveEdit} loading={savingEdit} className="flex-1">שמור</Button>
                </div>
              </div>
            ) : (

            <div className="p-5 space-y-4">
              {/* Image */}
              {meal.imageURL && (
                <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                  <Image src={meal.imageURL} alt={meal.analysis.description} fill className="object-cover" />
                </div>
              )}

              {/* Calories + description */}
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-wing-primary">{meal.analysis.calories}</span>
                  <span className="text-slate-400">קק&quot;ל</span>
                </div>
                <p className="text-base text-slate-700 leading-relaxed">{meal.analysis.description}</p>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "חלבון", value: meal.analysis.protein, color: "bg-red-50 text-red-600" },
                  { label: "פחמימות", value: meal.analysis.carbs, color: "bg-yellow-50 text-yellow-700" },
                  { label: "שומן", value: meal.analysis.fat, color: "bg-blue-50 text-blue-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`${color} rounded-2xl p-3 text-center`}>
                    <p className="text-xl font-bold">{value}g</p>
                    <p className="text-sm mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Fiber + health score */}
              <div className="flex gap-3 text-sm text-slate-500">
                {meal.analysis.fiber > 0 && (
                  <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-xl">
                    🌿 סיבים: {meal.analysis.fiber}g
                  </span>
                )}
                <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl">
                  {"⭐".repeat(Math.round(meal.analysis.healthScore / 2))} ציון {meal.analysis.healthScore}/10
                </span>
              </div>

              {/* Food items */}
              {meal.analysis.items && meal.analysis.items.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-2">פירוט מנות</p>
                  <div className="space-y-1.5">
                    {meal.analysis.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-xl">
                        <span>{item.name}</span>
                        <span className="text-slate-400">{item.estimatedGrams}g · {item.calories} קק&quot;ל</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {meal.analysis.tips && (
                <div className="bg-wing-soft text-wing-primary px-4 py-3 rounded-2xl text-sm leading-relaxed">
                  💡 {meal.analysis.tips}
                </div>
              )}

              {/* Comments */}
              {comments.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-2">תגובות</p>
                  <div className="space-y-2">
                    {comments.map((c, i) => (
                      <div key={i} className="text-sm bg-wing-soft rounded-xl px-3 py-2">
                        <span className="font-medium text-wing-primary">{c.authorName}: </span>
                        <span className="text-slate-600">{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment input */}
              {currentUserId && (isOwn ? comments.length > 0 : true) && (
                <div className="flex gap-2">
                  <input type="text" value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={isOwn ? "הגב / תודה על העידוד..." : `עודד את ${meal.userName}...`}
                    className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wing-primary bg-slate-50"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                  />
                  <Button size="sm" onClick={handleSend} loading={sending} disabled={!text.trim()}>
                    שלח
                  </Button>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
