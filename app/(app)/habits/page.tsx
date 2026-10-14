"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import {
  habitsFor,
  getCurrentHabit,
  allHabitsInstalled,
  AUTOMATICITY_MEDIAN_DAYS,
  AUTOMATICITY_RANGE_DAYS,
} from "@/lib/book/habits";
import toast from "react-hot-toast";

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export default function HabitsPage() {
  const { user, firebaseUser } = useAuth();
  const { lang, dir } = useLanguage();
  const he = lang === "he";
  const router = useRouter();
  const [marking, setMarking] = useState(false);
  const [openTip, setOpenTip] = useState<number | null>(null);

  const progress = user?.habitProgress;
  const current = getCurrentHabit(progress, lang);
  const done = allHabitsInstalled(progress);
  const installedCount = habitsFor(lang).filter((h) => progress?.[h.id]?.installedAt).length;

  async function handleMarkInstalled() {
    if (!current || !firebaseUser) return;
    setMarking(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/book/mark-installed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ habitId: current.id }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        current.order < 8
          ? he ? `יפה - הרגל ${current.order + 1} נפתח` : `Nice — habit ${current.order + 1} unlocked`
          : he ? "כל שמונת ההרגלים הותקנו!" : "All eight habits installed!"
      );
      router.refresh();
    } catch {
      toast.error(he ? "משהו השתבש, נסו שוב" : "Something went wrong, please try again");
    } finally {
      setMarking(false);
    }
  }

  if (!current && !done) {
    // Shouldn't normally happen (book onboarding starts habit 1), but avoid a blank page.
    return (
      <div className="p-4 pt-8 text-center">
        <p className="text-sm text-wing-muted">{he ? "מכינים את ההרגל הראשון שלך..." : "Setting up your first habit…"}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" dir={dir}>
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-wing-ink tracking-tight">{he ? "הרגלים" : "Habits"}</h1>
        <p className="text-sm font-mono text-wing-muted" dir="ltr">{installedCount} / 8</p>
      </div>

      {done ? (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-6 text-center space-y-2">
          <p className="font-black text-lg text-wing-ink">{he ? "כל שמונת ההרגלים הותקנו" : "All eight habits installed"}</p>
          <p className="text-sm text-wing-muted leading-relaxed">
            {he
              ? "\"זו לא דיאטה שסיימתם. זו הדרך שבה אתם אוכלים עכשיו.\" אפשר לחזור לכל הרגל בכל עת, כשהחך או העין צריכים כיול מחדש."
              : "\"That's not a diet you finished. It's how you eat now.\" Revisit any habit below whenever your palate or your eye needs recalibrating."}
          </p>
        </div>
      ) : current ? (
        <>
          <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-4">
            <div>
              <p className="text-xs font-bold text-wing-heat uppercase tracking-wider mb-1">
                {he ? `הרגל ${current.order} מתוך 8` : `Habit ${current.order} of 8`}
              </p>
              <h2 className="text-xl font-black text-wing-ink">{current.name}</h2>
              <p className="text-sm text-wing-muted mt-1 leading-relaxed">{current.tagline}</p>
            </div>

            <div className="space-y-2 text-sm text-wing-ink">
              <p><span className="font-bold">{he ? "סימן מפעיל:" : "Cue:"}</span> {current.cue}</p>
              <p><span className="font-bold">{he ? "הפעולה:" : "Routine:"}</span> {current.routine}</p>
              <p><span className="font-bold">{he ? "התגמול:" : "Reward:"}</span> {current.reward}</p>
            </div>

            <div className="bg-wing-elevated border border-wing-border rounded-2xl px-4 py-3">
              <p className={`text-sm text-wing-ink ${he ? "" : "font-mono"}`}>"{current.triggerSentence}"</p>
            </div>

            {progress?.[current.id]?.startedAt && (
              <p className="text-xs text-wing-subtle">
                {he
                  ? `יום ${daysSince(progress[current.id].startedAt)} בהרגל הזה - לפי מחקר, החציוני להפיכת הרגל לאוטומטי הוא ${AUTOMATICITY_MEDIAN_DAYS} ימים (טווח ${AUTOMATICITY_RANGE_DAYS[0]}–${AUTOMATICITY_RANGE_DAYS[1]}, תלוי בהרגל). זו ציפייה, לא מועד סופי.`
                  : `Day ${daysSince(progress[current.id].startedAt)} on this habit — most people take a median of ${AUTOMATICITY_MEDIAN_DAYS} days to make it automatic (range ${AUTOMATICITY_RANGE_DAYS[0]}–${AUTOMATICITY_RANGE_DAYS[1]}, depending on the habit). Expect it, not a deadline.`}
              </p>
            )}
          </div>

          <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-2">
            <p className="text-sm font-bold text-wing-ink mb-1">{he ? "למה זה עובד" : "Why it works"}</p>
            {current.whyItWorks.map((w, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={12} className="text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-wing-ink leading-relaxed">{w}</span>
              </div>
            ))}
          </div>

          {current.objections.length > 0 && (
            <div className="bg-wing-surface border border-wing-border rounded-[20px] overflow-hidden">
              <p className="text-sm font-bold text-wing-ink p-5 pb-2">{he ? "מה אולי עובר לכם בראש" : "What you're probably thinking"}</p>
              {current.objections.map((o, i) => (
                <div key={i} className="border-t border-wing-divider">
                  <button
                    onClick={() => setOpenTip(openTip === i ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-3 text-start"
                  >
                    <span className="text-sm font-semibold text-wing-ink">{o.q}</span>
                    <ChevronDown size={16} className={`text-wing-muted shrink-0 transition-transform ${openTip === i ? "rotate-180" : ""}`} />
                  </button>
                  {openTip === i && (
                    <p className="text-sm text-wing-muted leading-relaxed px-5 pb-4">{o.a}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {current.hardSituations.length > 0 && (
            <div className="bg-wing-elevated border border-wing-border rounded-[20px] p-5 space-y-3">
              <p className="text-sm font-bold text-wing-ink">{he ? "מצבים מאתגרים" : "Hard situations"}</p>
              {current.hardSituations.map((s, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-wing-ink">{s.situation}</p>
                  <p className="text-sm text-wing-muted leading-relaxed">{s.tip}</p>
                </div>
              ))}
            </div>
          )}

          <Button className="w-full" onClick={handleMarkInstalled} loading={marking}>
            {he ? "סימון ההרגל כמותקן" : "Mark this habit installed"}
          </Button>
          <p className="text-center text-xs text-wing-subtle -mt-2">
            {he
              ? "מוכנים להמשיך? האם עשיתם את זה לפחות ב־11 מתוך 14 הימים האחרונים, בלי תכנון מיוחד?"
              : "The real test: does it happen on a day you're tired and rushed, without thinking about it?"}
          </p>
        </>
      ) : null}
    </div>
  );
}
