"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  getChallenge,
  getWingCheckinsRange,
  getWingStepsRange,
  updateChallengeProgress,
  finishChallenge,
} from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { format, differenceInDays, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { ArrowRight, ArrowLeft, Trophy, Flag } from "lucide-react";
import type { Challenge, WingMember } from "@/types";

type ProgressMap = Record<string, number>;

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = [
  "bg-yellow-50 border-yellow-200",
  "bg-slate-50 border-slate-200",
  "bg-orange-50 border-orange-200",
];

function unitKey(type: Challenge["type"]) {
  if (type === "steps") return "challenge_unit_steps";
  if (type === "water") return "challenge_unit_glasses";
  if (type === "vegetables") return "challenge_unit_servings";
  if (type === "no_sugar") return "challenge_unit_days";
  return "challenge_unit_kcal";
}

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  const { wing } = useWing(user?.wingId);
  const { t, lang, dir } = useLanguage();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);
  const [myValue, setMyValue] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const isOwner = wing?.ownerId === firebaseUser?.uid;

  useEffect(() => {
    if (!user?.wingId || !id) return;
    loadChallenge();
  }, [user?.wingId, id]);

  async function loadChallenge() {
    if (!user?.wingId) return;
    setLoading(true);
    try {
      const c = await getChallenge(user.wingId, id as string);
      if (!c) { router.replace("/challenges"); return; }
      setChallenge(c);
      await computeProgress(c);
    } finally {
      setLoading(false);
    }
  }

  async function computeProgress(c: Challenge) {
    if (!user?.wingId) return;
    let map: ProgressMap = {};

    if (c.type === "steps") {
      const entries = await getWingStepsRange(user.wingId, c.startDate, c.endDate);
      for (const e of entries) {
        map[e.userId] = (map[e.userId] ?? 0) + e.steps;
      }
    } else if (c.type === "water" || c.type === "vegetables") {
      const checkins = await getWingCheckinsRange(user.wingId, c.startDate, c.endDate);
      for (const ci of checkins) {
        const val = c.type === "water" ? (ci.waterGlasses ?? 0) : (ci.vegetablesServings ?? 0);
        map[ci.userId] = (map[ci.userId] ?? 0) + val;
      }
    } else {
      // no_sugar / calories — manual progress from document
      map = { ...c.progress };
    }
    setProgress(map);
  }

  async function handleSaveProgress() {
    if (!user?.wingId || !firebaseUser || !challenge || !myValue) return;
    const value = Number(myValue);
    if (isNaN(value) || value < 0) return;
    setSavingProgress(true);
    try {
      await updateChallengeProgress(user.wingId, challenge.id, firebaseUser.uid, value);
      setProgress((prev) => ({ ...prev, [firebaseUser.uid]: value }));
      setMyValue("");
      toast.success(t("challenge_progress_saved") as string);
    } catch {
      toast.error("שגיאה");
    } finally {
      setSavingProgress(false);
    }
  }

  async function handleFinish() {
    if (!user?.wingId || !challenge || !wing) return;
    setFinishing(true);
    try {
      const challengeWithProgress: Challenge = { ...challenge, progress };
      await finishChallenge(user.wingId, challengeWithProgress, wing.members);
      setChallenge((prev) => prev ? { ...prev, status: "finished" } : prev);
      setShowFinishConfirm(false);
      toast.success("האתגר הסתיים! 🏆");
    } catch {
      toast.error("שגיאה בסיום האתגר");
    } finally {
      setFinishing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 pt-8 flex justify-center">
        <div className="text-wing-muted text-sm animate-pulse">טוען...</div>
      </div>
    );
  }

  if (!challenge) return null;

  const today = format(new Date(), "yyyy-MM-dd");
  const isFinished = challenge.status === "finished";
  const hasEnded = challenge.endDate < today;
  const endsToday = challenge.endDate === today;
  const daysLeft = differenceInDays(parseISO(challenge.endDate), new Date());

  const challengeTypes = [
    { value: "steps", emoji: "👟" },
    { value: "water", emoji: "💧" },
    { value: "vegetables", emoji: "🥦" },
    { value: "no_sugar", emoji: "🚫🍬" },
    { value: "calories", emoji: "🔥" },
  ];
  const emoji = challengeTypes.find((ct) => ct.value === challenge.type)?.emoji ?? "🏆";

  // Sort members by progress descending
  const sortedMembers = [...(wing?.members ?? [])].sort(
    (a, b) => (progress[b.uid] ?? 0) - (progress[a.uid] ?? 0)
  );

  const isManual = challenge.type === "no_sugar" || challenge.type === "calories";
  const unit = t(unitKey(challenge.type)) as string;

  return (
    <div className="p-4 space-y-4" dir={dir}>
      {/* Back */}
      <div className="pt-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-wing-muted hover:text-wing-ink transition-colors"
        >
          {lang === "he" ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          {lang === "he" ? "חזרה לאתגרים" : "Back to challenges"}
        </button>
      </div>

      {/* Header card */}
      <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-4xl">{emoji}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-wing-ink text-lg leading-tight">{challenge.title}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isFinished ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"
              }`}>
                {isFinished ? t("challenge_finished_badge") as string : t("challenge_active_badge") as string}
              </span>
            </div>
            <p className="text-xs text-wing-muted mt-0.5">
              {challenge.startDate} – {challenge.endDate}
            </p>
            {challenge.description ? (
              <p className="text-sm text-wing-subtle mt-1">{challenge.description}</p>
            ) : null}
          </div>
        </div>

        {/* Goal + time left */}
        <div className="flex gap-2">
          <div className="flex-1 bg-wing-elevated rounded-2xl px-4 py-2.5 text-center">
            <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">
              {lang === "he" ? "יעד" : "Goal"}
            </p>
            <p className="font-black text-wing-heat text-lg" style={{ letterSpacing: "-0.03em" }}>
              {challenge.targetValue.toLocaleString()}
            </p>
            <p className="text-[10px] text-wing-muted">{unit}</p>
          </div>
          <div className="flex-1 bg-wing-elevated rounded-2xl px-4 py-2.5 text-center">
            <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">
              {lang === "he" ? "זמן" : "Time"}
            </p>
            <p className={`font-black text-lg ${endsToday ? "text-red-500" : "text-wing-ink"}`} style={{ letterSpacing: "-0.03em" }}>
              {isFinished || hasEnded
                ? (t("challenge_ended") as string)
                : endsToday
                ? (t("challenge_ends_today") as string)
                : (t("challenge_days_left") as (n: number) => string)(Math.max(0, daysLeft))}
            </p>
          </div>
        </div>
      </div>

      {/* Winner announcement (if finished) */}
      {isFinished && challenge.winners && challenge.winners.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-[20px] p-5 text-white space-y-3">
          <div className="flex items-center gap-2">
            <Trophy size={20} />
            <h2 className="font-black text-lg">{t("challenge_finished_title") as string}</h2>
          </div>
          <div className="space-y-2">
            {challenge.winners.slice(0, 3).map((uid, idx) => {
              const member = wing?.members.find((m) => m.uid === uid);
              if (!member) return null;
              const placeKeys = ["challenge_winner_1", "challenge_winner_2", "challenge_winner_3"] as const;
              return (
                <div key={uid} className="flex items-center gap-3 bg-white/20 rounded-2xl px-4 py-2.5">
                  <Avatar name={member.displayName} photoURL={member.photoURL} size={32} isCurrentUser={uid === firebaseUser?.uid} />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{member.displayName}</p>
                    <p className="text-xs text-white/80">{(progress[uid] ?? 0).toLocaleString()} {unit}</p>
                  </div>
                  <span className="font-black text-sm">{t(placeKeys[idx]) as string}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
        <h2 className="font-bold text-wing-ink flex items-center gap-2">
          <Trophy size={16} className="text-wing-muted" />
          {t("challenge_leaderboard") as string}
        </h2>

        {sortedMembers.length === 0 ? (
          <p className="text-sm text-wing-muted text-center py-4">{t("challenge_no_data") as string}</p>
        ) : (
          <div className="space-y-2">
            {sortedMembers.map((member, idx) => {
              const val = progress[member.uid] ?? 0;
              const pct = Math.min(100, challenge.targetValue > 0 ? (val / challenge.targetValue) * 100 : 0);
              const isMe = member.uid === firebaseUser?.uid;
              const medal = idx < 3 ? MEDAL[idx] : null;

              return (
                <div
                  key={member.uid}
                  className={`rounded-[14px] border px-3 py-2.5 ${
                    isMe
                      ? "border-wing-primary bg-wing-primary/5"
                      : idx < 3
                      ? MEDAL_BG[idx]
                      : "border-wing-border bg-wing-elevated"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="w-5 text-center text-sm font-bold text-wing-muted">
                      {medal ?? `${idx + 1}`}
                    </span>
                    <Avatar name={member.displayName} photoURL={member.photoURL} size={28} isCurrentUser={isMe} />
                    <span className="flex-1 text-sm font-semibold text-wing-ink">
                      {isMe ? (lang === "he" ? "אני" : "Me") : member.displayName.split(" ")[0]}
                    </span>
                    <span className="text-sm font-black text-wing-ink tabular" style={{ letterSpacing: "-0.03em" }}>
                      {val.toLocaleString()}
                      <span className="text-xs font-normal text-wing-muted ml-1">{unit}</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="ml-7 h-1.5 bg-wing-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 100 ? "#22c55e" : "linear-gradient(90deg, #f5dd4b, #ff6b47)",
                      }}
                    />
                  </div>
                  <p className="ml-7 text-[10px] text-wing-muted mt-0.5">{Math.round(pct)}% {lang === "he" ? "מהיעד" : "of goal"}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual progress update (for no_sugar / calories) */}
      {isManual && !isFinished && !hasEnded && (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
          <h2 className="font-bold text-wing-ink text-sm">{t("challenge_update_progress") as string}</h2>
          <div className="flex gap-2">
            <input
              type="number"
              value={myValue}
              onChange={(e) => setMyValue(e.target.value)}
              placeholder={t("challenge_progress_ph") as string}
              className="flex-1 bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wing-ink"
              inputMode="numeric"
              dir="ltr"
            />
            <Button onClick={handleSaveProgress} loading={savingProgress} disabled={!myValue}>
              {t("challenge_save_progress") as string}
            </Button>
          </div>
        </div>
      )}

      {/* Finish challenge (owner only, not finished, ended or has data) */}
      {isOwner && !isFinished && (hasEnded || endsToday) && (
        <div className="space-y-2">
          {showFinishConfirm ? (
            <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium">{t("challenge_finish_confirm") as string}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowFinishConfirm(false)} className="flex-1">
                  {t("cancel") as string}
                </Button>
                <Button onClick={handleFinish} loading={finishing} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                  {t("challenge_finish_btn") as string}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFinishConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] border border-wing-border text-sm font-medium text-wing-muted hover:bg-wing-elevated transition-colors"
            >
              <Flag size={16} />
              {t("challenge_finish_btn") as string}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
