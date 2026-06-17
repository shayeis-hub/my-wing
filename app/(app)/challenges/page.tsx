"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  saveChallenge,
  getWingChallenges,
  getWingStepsRange,
  getWingCheckinsRange,
  finishChallenge,
} from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { format, addDays } from "date-fns";
import { useRouter } from "next/navigation";
import { Trophy, ChevronRight, ChevronLeft, Footprints, Droplets, Salad, Ban, Flame, Award } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { isWingAdmin } from "@/lib/wing/roles";
import type { Challenge } from "@/types";

export default function ChallengesPage() {
  const { user } = useAuth();
  const { wing } = useWing(user?.wingId);
  const { t, lang, dir, gender } = useLanguage();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Challenge["type"]>("steps");
  const [targetValue, setTargetValue] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const [pastChallenges, setPastChallenges] = useState<Challenge[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);

  const canManage = isWingAdmin(wing, user?.uid);

  const challengeTypes: { value: Challenge["type"]; label: string; Icon: LucideIcon }[] = [
    { value: "steps",      label: t("ct_steps") as string, Icon: Footprints },
    { value: "water",      label: t("ct_water") as string, Icon: Droplets   },
    { value: "vegetables", label: t("ct_veg")   as string, Icon: Salad      },
    { value: "no_sugar",   label: t("ct_sugar") as string, Icon: Ban        },
    { value: "calories",   label: t("ct_cal")   as string, Icon: Flame      },
  ];

  useEffect(() => {
    if (!user?.wingId) return;
    setLoadingPast(true);
    getWingChallenges(user.wingId)
      .then((all) => {
        const today = format(new Date(), "yyyy-MM-dd");
        const past = all.filter((c) => c.status === "finished" || c.endDate < today);
        setPastChallenges(past);
      })
      .finally(() => setLoadingPast(false));
  }, [user?.wingId]);

  // Auto-finish expired active challenge
  useEffect(() => {
    const ac = wing?.activeChallenge;
    if (!ac || !user?.wingId || !wing?.members) return;
    const today = format(new Date(), "yyyy-MM-dd");
    if (ac.endDate >= today) return;

    async function autoFinish() {
      if (!user?.wingId || !wing?.members || !ac) return;
      let progress: Record<string, number> = { ...ac.progress };
      if (ac.type === "steps") {
        const entries = await getWingStepsRange(user.wingId, ac.startDate, ac.endDate);
        progress = {};
        for (const e of entries) progress[e.userId] = (progress[e.userId] ?? 0) + e.steps;
      } else if (ac.type === "water" || ac.type === "vegetables") {
        const checkins = await getWingCheckinsRange(user.wingId, ac.startDate, ac.endDate);
        progress = {};
        for (const ci of checkins) {
          const val = ac.type === "water" ? (ci.waterGlasses ?? 0) : (ci.vegetablesServings ?? 0);
          progress[ci.userId] = (progress[ci.userId] ?? 0) + val;
        }
      }
      await finishChallenge(user.wingId, { ...ac, progress }, wing.members);
    }

    autoFinish().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wing?.activeChallenge?.id, user?.wingId]);

  async function handleCreate() {
    if (!user?.wingId || !title || !targetValue || !startDate || !endDate) return;
    if (endDate < startDate) {
      toast.error(lang === "he" ? "תאריך הסיום חייב להיות אחרי תאריך ההתחלה" : "End date must be after start date");
      return;
    }
    setSaving(true);
    try {
      await saveChallenge(user.wingId, {
        wingId: user.wingId,
        title,
        description,
        type,
        targetValue: +targetValue,
        startDate,
        endDate,
        progress: {},
        status: "active",
      });
      toast.success(t("challenge_created") as string);
      setShowCreate(false);
      setTitle(""); setDescription(""); setTargetValue("");
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setEndDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    } catch {
      toast.error(t("challenge_error") as string);
    } finally {
      setSaving(false);
    }
  }

  const ActiveIcon = challengeTypes.find((ct) => ct.value === wing?.activeChallenge?.type)?.Icon ?? Trophy;
  const ChevronIcon = lang === "he" ? ChevronLeft : ChevronRight;

  return (
    <div className="p-4 space-y-4" dir={dir}>
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-wing-ink">{t("challenges_title") as string}</h1>
        {canManage && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            {t("challenge_add") as string}
          </Button>
        )}
      </div>

      {/* Active challenge */}
      {wing?.activeChallenge ? (
        <button
          className="w-full text-start"
          onClick={() => router.push(`/challenges/${wing.activeChallenge!.id}`)}
        >
          <div className="bg-gradient-to-br from-wing-heat/10 to-yellow-50 border-2 border-wing-heat/20 rounded-[20px] p-5 space-y-3">
            <div className="flex items-center gap-3">
              <ActiveIcon size={28} className="text-wing-heat shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-wing-ink">{wing.activeChallenge.title}</h2>
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {t("challenge_active_badge") as string}
                  </span>
                </div>
                <p className="text-xs text-wing-subtle mt-0.5">
                  {wing.activeChallenge.startDate} – {wing.activeChallenge.endDate}
                </p>
              </div>
              <ChevronIcon size={20} className="text-wing-muted flex-shrink-0" />
            </div>
            {wing.activeChallenge.description ? (
              <p className="text-sm text-wing-muted">{wing.activeChallenge.description}</p>
            ) : null}
            <div className="bg-white/70 rounded-2xl px-4 py-2 text-sm text-wing-heat font-medium inline-flex gap-2">
              <Trophy size={14} className="mt-0.5" />
              {lang === "he" ? "יעד יומי" : "Daily goal"}: {wing.activeChallenge.targetValue.toLocaleString()}{" "}
              {wing.activeChallenge.type === "steps" ? t("challenge_steps_unit") as string : ""}
            </div>
            <p className="text-xs text-wing-heat font-medium">
              {lang === "he" ? (gender === "female" ? "לחצי לצפייה בלוח התוצאות ←" : "לחץ לצפייה בלוח התוצאות ←") : "Tap to view leaderboard →"}
            </p>
          </div>
        </button>
      ) : (
        <Card className="text-center py-8">
          <div className="flex justify-center mb-3"><Trophy size={36} className="text-wing-heat" /></div>
          <p className="font-semibold text-wing-ink">{t("challenge_no_active") as string}</p>
          <p className="text-sm text-wing-subtle mt-1">
            {canManage ? t("challenge_no_active_member") as string : t("challenge_no_active_guest") as string}
          </p>
        </Card>
      )}

      {/* Create form */}
      {showCreate && canManage && (
        <Card className="space-y-4 border-2 border-wing-border">
          <h3 className="font-bold text-wing-ink">{t("challenge_new") as string}</h3>
          <div className="grid grid-cols-2 gap-2">
            {challengeTypes.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setType(ct.value)}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-sm transition-all ${
                  type === ct.value
                    ? "border-wing-primary bg-wing-elevated text-wing-heat"
                    : "border-wing-border text-wing-muted hover:bg-wing-elevated"
                }`}
              >
                <ct.Icon size={16} />
                <span className="font-medium">{ct.label}</span>
              </button>
            ))}
          </div>
          <Input label={t("challenge_name_label") as string} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("challenge_name_ph") as string} />
          <Input label={t("challenge_desc_label") as string} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("challenge_desc_ph") as string} />
          <Input label={lang === "he" ? "יעד יומי" : "Daily target"} type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="6000" dir="ltr" />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label={lang === "he" ? "תאריך התחלה" : "Start date"}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              dir="ltr"
            />
            <Input
              label={lang === "he" ? "תאריך סיום" : "End date"}
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">
              {t("cancel") as string}
            </Button>
            <Button onClick={handleCreate} loading={saving} className="flex-1">
              {t("challenge_create_btn") as string}
            </Button>
          </div>
        </Card>
      )}

      {/* Past challenges */}
      {!loadingPast && pastChallenges.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-wing-ink text-sm px-1">{t("challenge_past_title") as string}</h2>
          {pastChallenges.map((c) => {
            const Icon = challengeTypes.find((ct) => ct.value === c.type)?.Icon ?? Trophy;
            return (
              <button
                key={c.id}
                className="w-full text-start"
                onClick={() => router.push(`/challenges/${c.id}`)}
              >
                <div className="bg-wing-surface border border-wing-border rounded-[16px] px-4 py-3 flex items-center gap-3">
                  <Icon size={22} className="text-wing-heat shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-wing-ink text-sm">{c.title}</p>
                    <p className="text-xs text-wing-muted">{c.startDate} – {c.endDate}</p>
                  </div>
                  {c.winners && c.winners.length > 0 && (
                    <Award size={18} className="text-yellow-500" />
                  )}
                  <ChevronIcon size={16} className="text-wing-muted" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
