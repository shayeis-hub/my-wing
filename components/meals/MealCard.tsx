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
import { X, Pencil, MessageCircle } from "lucide-react";

interface MealCardProps {
  meal: Meal;
  currentUserId?: string;
  currentUserName?: string;
  hero?: boolean;
}

const mealTypeLabels: Record<Meal["mealType"], string> = {
  breakfast: "ארוחת בוקר",
  lunch: "ארוחת צהריים",
  dinner: "ארוחת ערב",
  snack: "חטיף",
};

export function MealCard({ meal, currentUserId, currentUserName, hero = false }: MealCardProps) {
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
      {hero ? (
        /* ── Hero card ── */
        <div
          className="rounded-[14px] border border-wing-border bg-wing-surface overflow-hidden cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          {/* Image with overlay */}
          <div className="relative w-full" style={{ height: 130 }}>
            {meal.imageURL ? (
              <Image src={meal.imageURL} alt={meal.analysis.description} fill className="object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #b5c8a0, #889e75)" }} />
            )}
            {/* Top-right badge */}
            <div className="absolute top-2 left-2">
              <span className="bg-white/90 text-wing-ink font-mono text-[11px] tracking-[0.12em] px-2 py-0.5 rounded-full">
                {mealTypeLabels[meal.mealType]}{meal.mealTime && ` · ${meal.mealTime}`}
              </span>
            </div>
            {/* Bottom gradient overlay */}
            <div
              className="absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-6"
              style={{ background: "linear-gradient(transparent, rgba(255,255,255,0.96))" }}
            >
              <div className="flex items-end justify-between">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-[11px] text-wing-muted">{meal.userName}</p>
                  <p className="text-sm font-bold text-wing-ink truncate leading-tight">{meal.analysis.description}</p>
                </div>
                <div className="flex-shrink-0 text-left">
                  <span
                    className="font-black tabular text-wing-ink"
                    style={{ fontSize: 26, letterSpacing: "-0.04em", fontFeatureSettings: '"tnum"', lineHeight: 1 }}
                  >
                    {meal.analysis.calories}
                  </span>
                  <span className="font-mono text-[11px] tracking-wider text-wing-muted block">קק&quot;ל</span>
                </div>
              </div>
            </div>
          </div>

          {/* Macros footer */}
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-wing-border">
            <div className="flex gap-3 font-mono text-xs tracking-[0.04em]">
              <span style={{ color: "#d4541a" }}>P {meal.analysis.protein}</span>
              <span style={{ color: "#c79a00" }}>C {meal.analysis.carbs}</span>
              <span style={{ color: "#2f8d5f" }}>F {meal.analysis.fat}</span>
            </div>
            {comments.length > 0 && (
              <button
                className="flex items-center gap-1 text-xs text-wing-muted"
                onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v); }}
              >
                <MessageCircle size={13} />
                {comments.length}
              </button>
            )}
          </div>

          {showComments && (
            <div className="px-3 pb-3 space-y-1.5">
              {comments.map((c, i) => (
                <div key={i} className="text-sm bg-wing-elevated rounded-xl px-3 py-2">
                  <span className="font-semibold text-wing-heat">{c.authorName}: </span>
                  <span className="text-wing-muted">{c.text}</span>
                </div>
              ))}
            </div>
          )}
          {currentUserId && (isOwn ? comments.length > 0 : true) && (
            <div className="flex gap-2 px-3 pb-3" onClick={(e) => e.stopPropagation()}>
              <input type="text" value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isOwn ? "הגב / תודה..." : `עודד את ${meal.userName}...`}
                className="flex-1 text-sm border border-wing-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wing-ink bg-wing-bg"
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              />
              <Button size="sm" onClick={handleSend} loading={sending} disabled={!text.trim()}>שלח</Button>
            </div>
          )}
        </div>
      ) : (
        /* ── Compact row ── */
        <div
          className="flex items-center gap-3 bg-wing-surface rounded-[14px] border border-wing-border px-3 py-2.5 cursor-pointer hover:bg-wing-elevated transition-colors"
          onClick={() => setShowModal(true)}
        >
          {meal.imageURL ? (
            <div className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 46, height: 46 }}>
              <Image src={meal.imageURL} alt={meal.analysis.description} fill className="object-cover" />
            </div>
          ) : (
            <div
              className="flex-shrink-0 rounded-xl"
              style={{ width: 46, height: 46, background: "linear-gradient(135deg, #e8dcc8, #d4c9ae)" }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs text-wing-muted truncate">{meal.userName}</p>
              <p className="text-sm font-black tabular flex-shrink-0 text-wing-ink" style={{ letterSpacing: "-0.03em" }}>
                {meal.analysis.calories}
                <span className="text-[11px] font-normal text-wing-subtle mr-0.5">קק&quot;ל</span>
              </p>
            </div>
            <p className="text-sm font-semibold text-wing-ink truncate leading-tight">{meal.analysis.description}</p>
            <div className="flex gap-2 mt-0.5 font-mono text-[11px] tracking-[0.04em]">
              <span style={{ color: "#d4541a" }}>P {meal.analysis.protein}</span>
              <span style={{ color: "#c79a00" }}>C {meal.analysis.carbs}</span>
              <span style={{ color: "#2f8d5f" }}>F {meal.analysis.fat}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-wing-surface w-full max-w-md rounded-[14px] border border-wing-border max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-wing-border">
              <div>
                <p className="font-bold text-base text-wing-ink">{meal.userName}</p>
                <p className="text-sm text-wing-muted">
                  {mealTypeLabels[meal.mealType]}
                  {meal.mealTime && ` · ${meal.mealTime}`}
                  {" · "}{timeAgo}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {isOwn && !editing && (
                  <button onClick={openEdit} className="p-2 rounded-xl hover:bg-wing-elevated text-wing-muted">
                    <Pencil size={18} />
                  </button>
                )}
                <button onClick={() => { setShowModal(false); setEditing(false); }} className="p-2 rounded-xl hover:bg-wing-elevated text-wing-muted">
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
                  className="w-full border border-wing-border rounded-2xl px-3 py-2.5 text-sm bg-wing-bg focus:outline-none focus:ring-2 focus:ring-wing-ink"
                />
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["calories", "קק\"ל"],
                    ["protein", "חלבון g"],
                    ["carbs", "פחמימות g"],
                    ["fat", "שומן g"],
                  ] as [keyof typeof editForm, string][]).map(([field, label]) => (
                    <label key={field} className="flex flex-col gap-0.5">
                      <span className="text-xs text-wing-muted">{label}</span>
                      <input
                        type="number"
                        value={editForm[field] as number}
                        onChange={(e) => setEditForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                        className="border border-wing-border rounded-xl px-2 py-1.5 text-sm w-full bg-wing-bg focus:outline-none focus:ring-2 focus:ring-wing-ink"
                        inputMode="numeric"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={editForm.mealType}
                    onChange={(e) => setEditForm((f) => ({ ...f, mealType: e.target.value as Meal["mealType"] }))}
                    className="flex-1 bg-wing-bg border border-wing-border rounded-2xl px-3 py-2.5 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
                  >
                    {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
                      <option key={t} value={t}>{mealTypeLabels[t]}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={editForm.mealTime}
                    onChange={(e) => setEditForm((f) => ({ ...f, mealTime: e.target.value }))}
                    className="bg-wing-bg border border-wing-border rounded-2xl px-3 py-2.5 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink w-28"
                  />
                </div>
                <div className="flex gap-3 sticky bottom-0 bg-wing-surface pt-2 pb-1">
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
                    <span className="text-3xl font-extrabold text-wing-heat">{meal.analysis.calories}</span>
                    <span className="text-wing-muted">קק&quot;ל</span>
                  </div>
                  <p className="text-base text-wing-ink leading-relaxed">{meal.analysis.description}</p>
                </div>

                {/* Macros */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "חלבון", value: meal.analysis.protein, bg: "#fff0eb", color: "#d4541a" },
                    { label: "פחמימות", value: meal.analysis.carbs, bg: "#fff8e0", color: "#c79a00" },
                    { label: "שומן", value: meal.analysis.fat, bg: "#eaf5ef", color: "#2f8d5f" },
                  ].map(({ label, value, bg, color }) => (
                    <div key={label} className="rounded-2xl p-3 text-center" style={{ background: bg }}>
                      <p className="text-xl font-bold" style={{ color }}>{value}g</p>
                      <p className="text-sm mt-0.5" style={{ color }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Fiber + health score */}
                <div className="flex gap-3 text-sm text-wing-muted">
                  {meal.analysis.fiber > 0 && (
                    <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-xl">
                      סיבים: {meal.analysis.fiber}g
                    </span>
                  )}
                  <span className="bg-wing-elevated text-wing-muted px-3 py-1.5 rounded-xl">
                    ציון בריאות {meal.analysis.healthScore}/10
                  </span>
                </div>

                {/* Food items */}
                {meal.analysis.items && meal.analysis.items.length > 0 && (
                  <div>
                    <p className="font-semibold text-wing-ink mb-2">פירוט מנות</p>
                    <div className="space-y-1.5">
                      {meal.analysis.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm text-wing-muted bg-wing-elevated px-3 py-2 rounded-xl">
                          <span>{item.name}</span>
                          <span className="text-wing-subtle">{item.estimatedGrams}g · {item.calories} קק&quot;ל</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips */}
                {meal.analysis.tips && (
                  <div className="bg-wing-elevated text-wing-heat px-4 py-3 rounded-2xl text-sm leading-relaxed border border-wing-border">
                    {meal.analysis.tips}
                  </div>
                )}

                {/* Comments */}
                {comments.length > 0 && (
                  <div>
                    <p className="font-semibold text-wing-ink mb-2">תגובות</p>
                    <div className="space-y-2">
                      {comments.map((c, i) => (
                        <div key={i} className="text-sm bg-wing-elevated rounded-xl px-3 py-2">
                          <span className="font-semibold text-wing-heat">{c.authorName}: </span>
                          <span className="text-wing-muted">{c.text}</span>
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
                      className="flex-1 text-sm border border-wing-border rounded-xl px-3 py-2.5 bg-wing-bg focus:outline-none focus:ring-2 focus:ring-wing-ink"
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
