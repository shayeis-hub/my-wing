"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { addMealComment, deleteMealComment, updateMeal, deleteMeal, toggleMealReaction } from "@/lib/firebase/firestore";
import type { Meal, Encouragement, Reaction, ReactionType } from "@/types";
import { Reactions } from "@/components/ui/Reactions";
import { formatDistanceToNow } from "date-fns";
import { he, enUS } from "date-fns/locale";
import toast from "react-hot-toast";
import { X, Pencil, Trash2, MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface MealCardProps {
  meal: Meal;
  currentUserId?: string;
  currentUserName?: string;
  isViewerAdmin?: boolean;
  hero?: boolean;
}

export function MealCard({ meal, currentUserId, currentUserName, isViewerAdmin = false, hero = false }: MealCardProps) {
  const { t, lang } = useLanguage();

  const mealTypeLabels: Record<Meal["mealType"], string> = {
    breakfast: t("meal_type_breakfast") as string,
    lunch: t("meal_type_lunch") as string,
    dinner: t("meal_type_dinner") as string,
    snack: t("meal_type_snack") as string,
  };

  const initialComments = meal.comments ?? [];
  const [comments, setComments] = useState<Encouragement[]>(initialComments);
  const [reactions, setReactions] = useState<Reaction[]>(meal.reactions ?? []);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Auto-expand comments on the hero card when there are any, so encouragements
  // from teammates are visible without having to tap a tiny icon.
  const [showComments, setShowComments] = useState(hero && initialComments.length > 0);
  const [showModal, setShowModal] = useState(false);

  // Deep-link: when the URL has ?meal=<id> matching this card, open its modal
  // automatically. Used by the encouragement push notification to land the user
  // on the exact meal that got the comment.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("meal") === meal.id) {
      setShowModal(true);
    }
  }, [searchParams, meal.id]);
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<number | null>(null);

  // Hide bottom nav while detail modal is open
  useEffect(() => {
    if (showModal) document.body.setAttribute("data-modal-open", "true");
    else document.body.removeAttribute("data-modal-open");
    return () => document.body.removeAttribute("data-modal-open");
  }, [showModal]);

  const timeAgo = meal.createdAt?.toDate
    ? formatDistanceToNow(meal.createdAt.toDate(), { addSuffix: true, locale: lang === "he" ? he : enUS })
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

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMeal(meal.wingId, meal.id);
      toast.success(t("meal_deleted") as string);
      setShowModal(false);
    } catch {
      toast.error(t("meal_delete_error") as string);
      setDeleting(false);
    }
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
      toast.success(t("meal_updated") as string);
      setEditing(false);
    } catch {
      toast.error(t("meal_update_error") as string);
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
          authorId: currentUserId,
          authorName: currentUserName,
          message: trimmed,
          link: `/meals?meal=${meal.id}`,
        }),
      });
      setComments((prev) => [...prev, comment]);
      setText("");
      setShowComments(true);
      toast.success(t("comment_sent") as string);
    } catch {
      toast.error(t("comment_error") as string);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteComment(idx: number) {
    const c = comments[idx];
    await deleteMealComment(meal.wingId, meal.id, c);
    setComments((prev) => prev.filter((_, i) => i !== idx));
    setConfirmDeleteComment(null);
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
                  <span className="font-mono text-[11px] tracking-wider text-wing-muted block">{t("kcal") as string}</span>
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
              {comments.map((c, i) => {
                const canDel = c.authorId === currentUserId || isViewerAdmin;
                return (
                  <div key={i} className="text-sm bg-wing-elevated rounded-xl px-3 py-2">
                    <div className="flex items-start gap-1">
                      <span className="flex-1">
                        <span className="font-semibold text-wing-heat">{c.authorName}: </span>
                        <span className="text-wing-muted">{c.text}</span>
                      </span>
                      {canDel && (
                        <button onClick={() => setConfirmDeleteComment(confirmDeleteComment === i ? null : i)}
                          className="p-0.5 text-wing-muted hover:text-red-500 shrink-0">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {confirmDeleteComment === i && (
                      <div className="mt-1.5 flex gap-2">
                        <button onClick={() => setConfirmDeleteComment(null)}
                          className="flex-1 py-1 rounded-xl text-xs border border-wing-border text-wing-muted">{t("cancel")}</button>
                        <button onClick={() => handleDeleteComment(i)}
                          className="flex-1 py-1 rounded-xl text-xs bg-red-500 text-white font-bold">{t("post_yes_delete")}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {currentUserId && (isOwn ? comments.length > 0 : true) && (
            <div className="flex gap-2 px-3 pb-3" onClick={(e) => e.stopPropagation()}>
              <input type="text" value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isOwn ? t("meal_reply_ph") as string : (t("checkin_encourage_ph") as (name: string) => string)(meal.userName)}
                className="flex-1 text-sm border border-wing-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wing-ink bg-wing-bg"
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              />
              <Button size="sm" onClick={handleSend} loading={sending} disabled={!text.trim()}>{t("send_btn") as string}</Button>
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
                <span className="text-[11px] font-normal text-wing-subtle mr-0.5">{t("kcal") as string}</span>
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
                <button onClick={() => { setShowModal(false); setEditing(false); setConfirmDelete(false); }} className="p-2 rounded-xl hover:bg-wing-elevated text-wing-muted">
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
                  placeholder={t("meal_desc_ph") as string}
                  className="w-full border border-wing-border rounded-2xl px-3 py-2.5 text-sm bg-wing-bg focus:outline-none focus:ring-2 focus:ring-wing-ink"
                />
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["calories", t("kcal") as string],
                    ["protein", t("meals_protein") as string],
                    ["carbs", t("meals_carbs") as string],
                    ["fat", t("meals_fat") as string],
                  ] as [keyof typeof editForm, string][]).map(([field, label]: [keyof typeof editForm, string]) => (
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
                  <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1">{t("meal_cancel") as string}</Button>
                  <Button onClick={handleSaveEdit} loading={savingEdit} className="flex-1">{t("meal_save") as string}</Button>
                </div>

                {/* Delete */}
                <div className="border-t border-wing-border pt-3 mt-1">
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                      {t("meal_delete_btn") as string}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-center text-sm text-wing-ink font-medium">{t("meal_delete_confirm") as string}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 py-2 rounded-2xl text-sm border border-wing-border text-wing-muted hover:bg-wing-elevated transition-colors"
                        >
                          {t("meal_cancel") as string}
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex-1 py-2 rounded-2xl text-sm bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-60 transition-colors"
                        >
                          {deleting ? t("meal_deleting") as string : t("meal_delete_yes") as string}
                        </button>
                      </div>
                    </div>
                  )}
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
                    <span className="text-wing-muted">{t("kcal") as string}</span>
                  </div>
                  <p className="text-base text-wing-ink leading-relaxed">{meal.analysis.description}</p>
                </div>

                {/* Macros */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t("ob_protein") as string, value: meal.analysis.protein, bg: "#fff0eb", color: "#d4541a" },
                    { label: t("ob_carbs") as string, value: meal.analysis.carbs, bg: "#fff8e0", color: "#c79a00" },
                    { label: t("ob_fat") as string, value: meal.analysis.fat, bg: "#eaf5ef", color: "#2f8d5f" },
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
                      {t("meal_fiber") as string}: {meal.analysis.fiber}g
                    </span>
                  )}
                  <span className="bg-wing-elevated text-wing-muted px-3 py-1.5 rounded-xl">
                    {t("meal_health_score") as string} {meal.analysis.healthScore}/10
                  </span>
                </div>

                {/* Food items */}
                {meal.analysis.items && meal.analysis.items.length > 0 && (
                  <div>
                    <p className="font-semibold text-wing-ink mb-2">{t("meal_items_title") as string}</p>
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
                    <p className="font-semibold text-wing-ink mb-2">{t("meal_comments_title") as string}</p>
                    <div className="space-y-2">
                      {comments.map((c, i) => {
                        const canDel = c.authorId === currentUserId || isViewerAdmin;
                        return (
                          <div key={i} className="text-sm bg-wing-elevated rounded-xl px-3 py-2">
                            <div className="flex items-start gap-1">
                              <span className="flex-1">
                                <span className="font-semibold text-wing-heat">{c.authorName}: </span>
                                <span className="text-wing-muted">{c.text}</span>
                              </span>
                              {canDel && (
                                <button onClick={() => setConfirmDeleteComment(confirmDeleteComment === i ? null : i)}
                                  className="p-0.5 text-wing-muted hover:text-red-500 shrink-0">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            {confirmDeleteComment === i && (
                              <div className="mt-1.5 flex gap-2">
                                <button onClick={() => setConfirmDeleteComment(null)}
                                  className="flex-1 py-1 rounded-xl text-xs border border-wing-border text-wing-muted">{t("cancel")}</button>
                                <button onClick={() => handleDeleteComment(i)}
                                  className="flex-1 py-1 rounded-xl text-xs bg-red-500 text-white font-bold">{t("post_yes_delete")}</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reactions row */}
                {currentUserId && currentUserName && !isOwn && (
                  <Reactions
                    reactions={reactions}
                    currentUserId={currentUserId}
                    onToggle={async (type: ReactionType) => {
                      const next = await toggleMealReaction(meal.wingId, meal.id, reactions, currentUserId, currentUserName, type);
                      setReactions(next);
                    }}
                  />
                )}
                {/* Show reactions to the owner as read-only counts */}
                {currentUserId && isOwn && reactions.length > 0 && (
                  <Reactions
                    reactions={reactions}
                    currentUserId={currentUserId}
                    onToggle={async () => { /* owner can't react to own meal */ }}
                  />
                )}

                {/* Comment input */}
                {currentUserId && (isOwn ? comments.length > 0 : true) && (
                  <div className="flex gap-2">
                    <input type="text" value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={isOwn ? t("meal_reply_ph") as string : (t("checkin_encourage_ph") as (name: string) => string)(meal.userName)}
                      className="flex-1 text-sm border border-wing-border rounded-xl px-3 py-2.5 bg-wing-bg focus:outline-none focus:ring-2 focus:ring-wing-ink"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                    />
                    <Button size="sm" onClick={handleSend} loading={sending} disabled={!text.trim()}>
                      {t("send_btn") as string}
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
