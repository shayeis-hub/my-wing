"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { saveCheckin, getTodayCheckin, getWingCheckins, addEncouragement } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import type { DailyCheckin, Encouragement } from "@/types";

const moods = [
  { value: 1, emoji: "😞", label: "קשה" },
  { value: 2, emoji: "😕", label: "לא טוב" },
  { value: 3, emoji: "😐", label: "סביר" },
  { value: 4, emoji: "😊", label: "טוב" },
  { value: 5, emoji: "🤩", label: "מעולה" },
];

async function sendEncouragementPush(targetUserId: string, authorName: string, text: string) {
  await fetch("/api/notifications/encouragement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUserId, authorName, message: text }),
  });
}

export default function CheckinPage() {
  const { user, firebaseUser } = useAuth();
  const [myCheckin, setMyCheckin] = useState<DailyCheckin | null>(null);
  const [groupCheckins, setGroupCheckins] = useState<DailyCheckin[]>([]);
  const [water, setWater] = useState(0);
  const [vegetables, setVegetables] = useState(0);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");
  const [steps, setSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [encourageTexts, setEncourageTexts] = useState<Record<string, string>>({});
  const [sendingEnc, setSendingEnc] = useState<string | null>(null);
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
        setSteps(c.steps ? String(c.steps) : "");
      }
    });
    getWingCheckins(user.wingId, today).then(setGroupCheckins);
  }, [user?.wingId, firebaseUser, today]);

  async function handleSave() {
    if (!user?.wingId || !firebaseUser) return;
    setSaving(true);
    try {
      const trimmedNotes = notes.trim();
      const stepsNum = steps ? parseInt(steps) : undefined;
      await saveCheckin(user.wingId, {
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        date: today,
        waterGlasses: water,
        vegetablesServings: vegetables,
        mood,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        ...(stepsNum ? { steps: stepsNum } : {}),
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
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        ...(stepsNum ? { steps: stepsNum } : {}),
        createdAt: null as unknown as DailyCheckin["createdAt"],
      });
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendEncouragement(checkin: DailyCheckin) {
    const text = encourageTexts[checkin.id]?.trim();
    if (!text || !user || !firebaseUser) return;
    setSendingEnc(checkin.id);
    try {
      const enc: Encouragement = {
        authorId: firebaseUser.uid,
        authorName: user.displayName,
        text,
        createdAt: Date.now(),
      };
      await addEncouragement(user.wingId!, checkin.id, enc);
      await sendEncouragementPush(checkin.userId, user.displayName, text);
      setGroupCheckins((prev) =>
        prev.map((c) =>
          c.id === checkin.id
            ? { ...c, encouragements: [...(c.encouragements ?? []), enc] }
            : c
        )
      );
      setEncourageTexts((prev) => ({ ...prev, [checkin.id]: "" }));
      toast.success("העידוד נשלח! 💪");
    } catch {
      toast.error("שגיאה בשליחה");
    } finally {
      setSendingEnc(null);
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
          <span className="text-lg font-bold text-wing-primary">{water.toFixed(1)} ליטר</span>
        </div>
        <input
          type="range" min={0} max={3} step={0.1} value={water}
          onChange={(e) => setWater(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-wing-primary bg-slate-200"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0</span><span>1L</span><span>2L</span><span>3L</span>
        </div>
        <div className="flex justify-center gap-2 mt-3">
          {[0.5, 1, 1.5, 2, 2.5, 3].map((v) => (
            <button key={v} onClick={() => setWater(v)}
              className={`text-xs px-2 py-1 rounded-full transition-all ${water === v ? "bg-wing-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {v}L
            </button>
          ))}
        </div>
      </Card>

      {/* Vegetables */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">🥦 ירקות</h3>
          <span className="text-lg font-bold text-wing-primary">{vegetables} {vegetables === 1 ? "ארוחה" : "ארוחות"}</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">בכמה ארוחות אכלת ירקות היום?</p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setVegetables(Math.max(0, vegetables - 1))}
            className="w-10 h-10 bg-slate-100 rounded-full text-xl font-bold hover:bg-slate-200 transition-colors">−</button>
          <span className="text-3xl font-bold text-slate-700 w-12 text-center">{vegetables}</span>
          <button onClick={() => setVegetables(Math.min(6, vegetables + 1))}
            className="w-10 h-10 bg-green-50 rounded-full text-xl font-bold text-green-500 hover:bg-green-100 transition-colors">+</button>
        </div>
      </Card>

      {/* Steps */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-3">👟 צעדים</h3>
        <input
          type="number"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="כמה צעדים עשית היום?"
          inputMode="numeric"
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-wing-primary focus:border-transparent transition-all"
        />
      </Card>

      {/* Mood */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-3">😊 מצב רוח</h3>
        <div className="flex justify-around">
          {moods.map((m) => (
            <button key={m.value} onClick={() => setMood(m.value as 1 | 2 | 3 | 4 | 5)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${mood === m.value ? "bg-wing-soft scale-110" : "hover:bg-slate-50"}`}>
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

      {/* Group summary with encouragements */}
      {groupCheckins.length > 0 && (
        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">המבנה היום</h3>
          <div className="space-y-4">
            {groupCheckins.map((c) => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">{c.userName}</span>
                  <div className="flex gap-2 text-slate-500 text-xs">
                    <span>💧 {c.waterGlasses.toFixed(1)}L</span>
                    <span>🥦 {c.vegetablesServings}</span>
                    {c.steps ? <span>👟 {c.steps.toLocaleString()}</span> : null}
                    <span>{moods.find((m) => m.value === c.mood)?.emoji}</span>
                  </div>
                </div>
                {c.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-1.5 italic">
                    &ldquo;{c.notes}&rdquo;
                  </p>
                )}
                {(c.encouragements ?? []).map((enc, i) => (
                  <div key={i} className="text-xs bg-wing-soft rounded-xl px-3 py-1.5">
                    <span className="font-medium text-wing-primary">{enc.authorName}: </span>
                    <span className="text-slate-600">{enc.text}</span>
                  </div>
                ))}
                {c.userId !== firebaseUser?.uid && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={encourageTexts[c.id] ?? ""}
                      onChange={(e) => setEncourageTexts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder={`עודד את ${c.userName}...`}
                      className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-wing-primary bg-slate-50"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSendEncouragement(c); }}
                    />
                    <Button size="sm" onClick={() => handleSendEncouragement(c)}
                      loading={sendingEnc === c.id} disabled={!encourageTexts[c.id]?.trim()}>
                      שלח
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
