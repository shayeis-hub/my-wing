"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveChallenge } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { format, addDays } from "date-fns";
import type { Challenge } from "@/types";

export default function ChallengesPage() {
  const { user } = useAuth();
  const { wing } = useWing(user?.wingId);
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Challenge["type"]>("steps");
  const [targetValue, setTargetValue] = useState("");
  const [saving, setSaving] = useState(false);

  const isMember = !!user?.wingId;

  const challengeTypes: { value: Challenge["type"]; label: string; emoji: string }[] = [
    { value: "steps", label: t("ct_steps"), emoji: "👟" },
    { value: "water", label: t("ct_water"), emoji: "💧" },
    { value: "vegetables", label: t("ct_veg"), emoji: "🥦" },
    { value: "no_sugar", label: t("ct_sugar"), emoji: "🚫🍬" },
    { value: "calories", label: t("ct_cal"), emoji: "🔥" },
  ];

  async function handleCreate() {
    if (!user?.wingId || !title || !targetValue) return;
    setSaving(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      await saveChallenge(user.wingId, {
        wingId: user.wingId,
        title,
        description,
        type,
        targetValue: +targetValue,
        startDate: today,
        endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        progress: {},
      });
      toast.success(t("challenge_created"));
      setShowCreate(false);
      setTitle(""); setDescription(""); setTargetValue("");
    } catch {
      toast.error(t("challenge_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-wing-ink">{t("challenges_title")}</h1>
        {isMember && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            {t("challenge_add")}
          </Button>
        )}
      </div>

      {wing?.activeChallenge ? (
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">
              {challengeTypes.find((ct) => ct.value === wing.activeChallenge?.type)?.emoji}
            </span>
            <div>
              <h2 className="font-bold text-wing-ink">{wing.activeChallenge.title}</h2>
              <p className="text-xs text-wing-subtle">
                {wing.activeChallenge.startDate} – {wing.activeChallenge.endDate}
              </p>
            </div>
          </div>
          <p className="text-sm text-wing-muted">{wing.activeChallenge.description}</p>
          <div className="mt-3 bg-wing-elevated rounded-2xl px-4 py-2 text-sm text-wing-heat font-medium">
            {t("challenge_goal")}: {wing.activeChallenge.targetValue.toLocaleString()}{" "}
            {wing.activeChallenge.type === "steps" ? t("challenge_steps_unit") : ""}
          </div>
        </Card>
      ) : (
        <Card className="text-center py-8">
          <div className="text-4xl mb-3">🏆</div>
          <p className="font-semibold text-wing-ink">{t("challenge_no_active")}</p>
          <p className="text-sm text-wing-subtle mt-1">
            {isMember ? t("challenge_no_active_member") : t("challenge_no_active_guest")}
          </p>
        </Card>
      )}

      {showCreate && isMember && (
        <Card className="space-y-4 border-2 border-wing-border">
          <h3 className="font-bold text-wing-ink">{t("challenge_new")}</h3>
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
                <span>{ct.emoji}</span>
                <span className="font-medium">{ct.label}</span>
              </button>
            ))}
          </div>
          <Input label={t("challenge_name_label")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("challenge_name_ph")} />
          <Input label={t("challenge_desc_label")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("challenge_desc_ph")} />
          <Input label={t("challenge_target_label")} type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="10000" dir="ltr" />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">
              {t("cancel")}
            </Button>
            <Button onClick={handleCreate} loading={saving} className="flex-1">
              {t("challenge_create_btn")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
