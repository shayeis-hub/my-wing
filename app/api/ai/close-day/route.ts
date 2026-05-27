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

    const result = await generatePersonalDaySummary({
      userName: checkin.userName,
      dailyCalorieTarget: userProfile?.dailyCalorieTarget ?? 2000,
      meals,
      waterGlasses: checkin.waterGlasses ?? 0,
      vegetablesServings: checkin.vegetablesServings ?? 0,
      steps: checkin.steps,
      workout: checkin.workout,
      weightKg: checkin.weightKg,
      targetWeightKg: userProfile?.targetWeightKg,
      mood: checkin.mood ?? 3,
      notes: checkin.notes,
      lang: lang ?? "he",
    });

    // Save summary back to the checkin document
    const checkinRef = admin.firestore()
      .collection(`wings/${wingId}/checkins`)
      .doc(checkin.id);
    await checkinRef.update({ daySummary: result });

    return NextResponse.json(result);
  } catch (err) {
    console.error("close-day error:", err);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
