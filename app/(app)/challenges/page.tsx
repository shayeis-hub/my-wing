"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveChallenge } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { format, addDays } from "date-fns";
import type { Challenge } from "@/types";

const challengeTypes: { value: Challenge["type"]; label: string; emoji: string }[] = [
  { value: "steps", label: "יעד צעדים", emoji: "👟" },
  { value: "water", label: "שתיית מים", emoji: "💧" },
  { value: "vegetables", label: "ירקות יומיים", emoji: "🥦" },
  { value: "no_sugar", label: "ללא סוכר", emoji: "🚫🍬" },
  { value: "calories", label: "יעד קלוריות", emoji: "🔥" },
];

export default function ChallengesPage() {
  const { user, firebaseUser } = useAuth();
  const { wing } = useWing(user?.wingId);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Challenge["type"]>("steps");
  const [targetValue, setTargetValue] = useState("");
  const [saving, setSaving] = useState(false);

  const isOwner = wing?.ownerId === firebaseUser?.uid;

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
      toast.success("האתגר נוצר! 🏆");
      setShowCreate(false);
      setTitle(""); setDescription(""); setTargetValue("");
    } catch {
      toast.error("שגיאה ביצירת האתגר");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">אתגרים שבועיים</h1>
        {isOwner && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            + אתגר
          </Button>
        )}
      </div>

      {/* Active challenge */}
      {wing?.activeChallenge ? (
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">
              {challengeTypes.find((t) => t.value === wing.activeChallenge?.type)?.emoji}
            </span>
            <div>
              <h2 className="font-bold text-slate-800">{wing.activeChallenge.title}</h2>
              <p className="text-xs text-slate-400">
                {wing.activeChallenge.startDate} – {wing.activeChallenge.endDate}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600">{wing.activeChallenge.description}</p>
          <div className="mt-3 bg-wing-soft rounded-2xl px-4 py-2 text-sm text-wing-primary font-medium">
            יעד: {wing.activeChallenge.targetValue.toLocaleString()}{" "}
            {wing.activeChallenge.type === "steps" ? "צעדים" : ""}
          </div>
        </Card>
      ) : (
        <Card className="text-center py-8">
          <div className="text-4xl mb-3">🏆</div>
          <p className="font-semibold text-slate-700">אין אתגר פעיל</p>
          <p className="text-sm text-slate-400 mt-1">
            {isOwner ? "צור אתגר חדש למבנה" : "המנהל עוד לא יצר אתגר"}
          </p>
        </Card>
      )}

      {/* Create challenge form */}
      {showCreate && isOwner && (
        <Card className="space-y-4 border-2 border-wing-accent">
          <h3 className="font-bold text-slate-800">אתגר חדש</h3>

          <div className="grid grid-cols-2 gap-2">
            {challengeTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-sm transition-all ${
                  type === t.value
                    ? "border-wing-primary bg-wing-soft text-wing-primary"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{t.emoji}</span>
                <span className="font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          <Input label="שם האתגר" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="7 ימי הליכה..." />
          <Input label="תיאור" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="כל אחד עושה..." />
          <Input label="יעד (מספר)" type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="10000" dir="ltr" />

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">
              ביטול
            </Button>
            <Button onClick={handleCreate} loading={saving} className="flex-1">
              צור אתגר
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
