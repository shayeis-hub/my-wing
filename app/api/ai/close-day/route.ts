import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { admin, getAdminApp } from "@/lib/firebase/admin";
import { generatePersonalDaySummary } from "@/lib/ai/claude";

export async function POST(req: NextRequest) {
  try {
    const { wingId, userId, date, checkin, userProfile, lang } = await req.json();
    if (!wingId || !userId || !date || !checkin) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();

    // Fetch today's meals for this user
    const mealsSnap = await admin.firestore()
      .collection(`wings/${wingId}/meals`)
      .where("userId", "==", userId)
      .get();

    const meals = mealsSnap.docs
      .map((d) => d.data())
      .filter((m) => {
        const ts = m.createdAt;
        if (!ts) return false;
        const d = ts.toDate ? ts.toDate() : new Date(ts._seconds * 1000);
        return d.toISOString().slice(0, 10) === date;
      })
      .map((m) => ({
        description: m.analysis?.description ?? "",
        calories: m.analysis?.calories ?? 0,
        protein: m.analysis?.protein ?? 0,
        carbs: m.analysis?.carbs ?? 0,
        fat: m.analysis?.fat ?? 0,
        mealType: m.mealType ?? "snack",
      }));

    // Fetch the last few days' check-ins (not including today) so the summary
    // can call out real trends instead of describing today in isolation.
    const HISTORY_DAYS = 6;
    const baseDate = new Date(`${date}T12:00:00`);
    const historyDates: string[] = [];
    for (let i = HISTORY_DAYS; i >= 1; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      historyDates.push(d.toISOString().slice(0, 10));
    }
    const historySnaps = await Promise.all(
      historyDates.map((d) => admin.firestore().doc(`wings/${wingId}/checkins/${userId}_${d}`).get())
    );
    const recentHistory = historySnaps
      .map((snap, i) => (snap.exists ? { date: historyDates[i], c: snap.data()! } : null))
      .filter((x): x is { date: string; c: FirebaseFirestore.DocumentData } => x !== null)
      .map(({ date: d, c }) => ({
        date: d,
        waterGlasses: c.waterGlasses,
        vegetablesServings: c.vegetablesServings,
        steps: c.steps,
        workoutDone: !!(c.workouts?.length ? c.workouts.some((w: { done?: boolean }) => w.done) : c.workout?.done),
        weightKg: c.weightKg,
        mood: c.mood,
      }));

    const result = await generatePersonalDaySummary({
      userName: checkin.userName,
      dailyCalorieTarget: userProfile?.dailyCalorieTarget ?? 2000,
      meals,
      waterGlasses: checkin.waterGlasses ?? 0,
      vegetablesServings: checkin.vegetablesServings ?? 0,
      steps: checkin.steps,
      workout: checkin.workout,
      workouts: checkin.workouts,
      weightKg: checkin.weightKg,
      targetWeightKg: userProfile?.targetWeightKg,
      mood: checkin.mood ?? 3,
      notes: checkin.notes,
      lang: lang ?? "he",
      recentHistory,
    });

    // Save summary back to the checkin document
    const checkinRef = admin.firestore()
      .collection(`wings/${wingId}/checkins`)
      .doc(checkin.id);
    await checkinRef.update({ daySummary: result });

    return NextResponse.json(result);
  } catch (err) {
    console.error("close-day error:", err);
    const status = (err as { status?: number })?.status;
    if (status === 529 || status === 503) {
      return NextResponse.json({ error: "OVERLOADED" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
