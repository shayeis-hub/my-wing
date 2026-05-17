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
  const [notes, setNotes] = useState("");
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
        setNotes(c.notes ?? "");
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
        notes: notes.trim() || undefined,
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
        notes: notes.trim() || undefined,
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

      {/* Water slider */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">💧 שתיית מים</h3>
          <span className="text-lg font-bold text-wing-primary">
            {water.toFixed(1)} ליטר
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={3}
          step={0.1}
          value={water}
          onChange={(e) => setWater(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-wing-primary bg-slate-200"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0</span>
          <span>1L</span>
          <span>2L</span>
          <span>3L</span>
        </div>
        <div className="flex justify-center gap-2 mt-3">
          {[0.5, 1, 1.5, 2, 2.5, 3].map((v) => (
            <button
              key={v}
              onClick={() => setWater(v)}
              className={`text-xs px-2 py-1 rounded-full transition-all ${
                water === v
                  ? "bg-wing-primary text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {v}L
            </button>
          ))}
        </div>
      </Card>

      {/* Vegetables */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">🥦 ירקות</h3>
          <span className="text-lg font-bold text-wing-primary">
            {vegetables} {vegetables === 1 ? "ארוחה" : "ארוחות"}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">בכמה ארוחות אכלת ירקות היום?</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setVegetables(Math.max(0, vegetables - 1))}
            className="w-10 h-10 bg-slate-100 rounded-full text-xl font-bold hover:bg-slate-200 transition-colors"
          >
            −
          </button>
          <span className="text-3xl font-bold text-slate-700 w-12 text-center">
            {vegetables}
          </span>
          <button
            onClick={() => setVegetables(Math.min(6, vegetables + 1))}
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
                mood === m.value ? "bg-wing-soft scale-110" : "hover:bg-slate-50"
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] text-slate-500">{m.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Free text */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-2">✏️ הערה חופשית</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="איך היה היום? משהו שרצית לציין..."
          rows={3}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-wing-primary focus:border-transparent transition-all"
        />
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
                  <span>💧 {c.waterGlasses.toFixed(1)}L</span>
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
