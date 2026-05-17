"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { saveCheckin, getTodayCheckin, getWingCheckins } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import type { DailyCheckin } from "@/types";
import { ProgressBar } from "@/components/ui/ProgressBar";

const moods = [
  { value: 1, emoji: "😞", label: "קשה" },
  { value: 2, emoji: "😕", label: "לא טוב" },
  { value: 3, emoji: "😐", label: "סביר" },
  { value: 4, emoji: "😊", label: "טוב" },
  { value: 5, emoji: "🤩", label: "מעולה" },
];

export default function CheckinPage() {
  const { user, firebaseUser } = useAuth();
  const [myCheckin, setMyCheckin] = useState<DailyCheckin | null>(null);
  const [groupCheckins, setGroupCheckins] = useState<DailyCheckin[]>([]);
  const [water, setWater] = useState(0);
  const [vegetables, setVegetables] = useState(0);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    getTodayCheckin(user.wingId, firebaseUser.uid, today).then((c) => {
      if (c) {
        setMyCheckin(c);
        setWater(c.waterGlasses);
        setVegetables(c.vegetablesServings);
        setMood(c.mood);
      }
    });
    getWingCheckins(user.wingId, today).then(setGroupCheckins);
  }, [user?.wingId, firebaseUser, today]);

  async function handleSave() {
    if (!user?.wingId || !firebaseUser) return;
    setSaving(true);
    try {
      await saveCheckin(user.wingId, {
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        date: today,
        waterGlasses: water,
        vegetablesServings: vegetables,
        mood,
      });
      toast.success("הצ'ק-אין נשמר! 💪");
      setMyCheckin({
        id: `${firebaseUser.uid}_${today}`,
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        date: today,
        waterGlasses: water,
        vegetablesServings: vegetables,
        mood,
        createdAt: null as unknown as DailyCheckin["createdAt"],
      });
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-slate-800">צ&apos;ק-אין יומי</h1>
        <p className="text-sm text-slate-500">
          {format(new Date(), "EEEE, d MMMM", { locale: he })}
        </p>
      </div>

      {/* Water */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">💧 שתיית מים</h3>
          <span className="text-lg font-bold text-wing-primary">{water} / 8 כוסות</span>
        </div>
        <ProgressBar value={water} max={8} color="bg-blue-400" />
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setWater(Math.max(0, water - 1))}
            className="w-10 h-10 bg-slate-100 rounded-full text-xl font-bold hover:bg-slate-200 transition-colors"
          >
            −
          </button>
          <span className="text-3xl font-bold text-slate-700 w-12 text-center">{water}</span>
          <button
            onClick={() => setWater(Math.min(15, water + 1))}
            className="w-10 h-10 bg-wing-soft rounded-full text-xl font-bold text-wing-primary hover:bg-sky-100 transition-colors"
          >
            +
          </button>
        </div>
      </Card>

      {/* Vegetables */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">🥦 ירקות</h3>
          <span className="text-lg font-bold text-wing-primary">{vegetables} / 5 מנות</span>
        </div>
        <ProgressBar value={vegetables} max={5} color="bg-green-400" />
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setVegetables(Math.max(0, vegetables - 1))}
            className="w-10 h-10 bg-slate-100 rounded-full text-xl font-bold hover:bg-slate-200 transition-colors"
          >
            −
          </button>
          <span className="text-3xl font-bold text-slate-700 w-12 text-center">{vegetables}</span>
          <button
            onClick={() => setVegetables(Math.min(10, vegetables + 1))}
            className="w-10 h-10 bg-green-50 rounded-full text-xl font-bold text-green-500 hover:bg-green-100 transition-colors"
          >
            +
          </button>
        </div>
      </Card>

      {/* Mood */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-3">😊 מצב רוח</h3>
        <div className="flex justify-around">
          {moods.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value as 1 | 2 | 3 | 4 | 5)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                mood === m.value
                  ? "bg-wing-soft scale-110"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] text-slate-500">{m.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Button onClick={handleSave} loading={saving} size="lg" className="w-full">
        {myCheckin ? "עדכן צ'ק-אין" : "שמור צ'ק-אין"}
      </Button>

      {/* Group summary */}
      {groupCheckins.length > 0 && (
        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">המבנה היום</h3>
          <div className="space-y-2">
            {groupCheckins.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{c.userName}</span>
                <div className="flex gap-3 text-slate-500">
                  <span>💧 {c.waterGlasses}</span>
                  <span>🥦 {c.vegetablesServings}</span>
                  <span>{moods.find((m) => m.value === c.mood)?.emoji}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
