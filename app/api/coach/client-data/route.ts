import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { assertCoachOwnsClient, MenuAuthError } from "@/lib/server/coachMenu";
import { shiftDate } from "@/lib/coach/status";
import type { ClientDataCheckin, ClientDataDay, ClientDataMeal, ClientDataResponse } from "@/lib/coach/clientData";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const israelDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown, max = 600): string | undefined => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/**
 * All the data a client has entered (meals, daily check-ins, weight) for the
 * last 7 / 30 / 90 days, read across every wing the dietitian owns that the
 * client belongs to. Caller must be an active dietitian who owns this client.
 */
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const clientId = req.nextUrl.searchParams.get("clientId") ?? "";
    const requested = Number(req.nextUrl.searchParams.get("days"));
    const days = [7, 30, 90].includes(requested) ? requested : 30;
    await assertCoachOwnsClient(uid, clientId);

    getAdminApp();
    const db = admin.firestore();
    const today = israelDate(new Date());
    const dates = Array.from({ length: days }, (_, i) => shiftDate(today, -i)); // newest first
    const oldest = dates[dates.length - 1];

    const wingsSnap = await db.collection("wings").where("ownerId", "==", uid).where("memberIds", "array-contains", clientId).get();
    const wingIds = wingsSnap.docs.map((w) => w.id);

    const byDate = new Map<string, ClientDataDay>(
      dates.map((date) => [date, { date, checkin: null, meals: [], calories: 0, protein: 0, carbs: 0, fat: 0, steps: null, weightKg: null }])
    );
    const weightByDate = new Map<string, number>();

    for (const wingId of wingIds) {
      const checkinRefs = dates.map((d) => db.doc(`wings/${wingId}/checkins/${clientId}_${d}`));
      const [checkinSnaps, mealsSnap, stepsSnap, weightSnap] = await Promise.all([
        db.getAll(...checkinRefs),
        db.collection(`wings/${wingId}/meals`).where("userId", "==", clientId).orderBy("createdAt", "desc").limit(400).get(),
        db.collection(`wings/${wingId}/steps`).where("userId", "==", clientId).get().catch(() => null),
        db.collection(`wings/${wingId}/weightLogs`).where("userId", "==", clientId).get().catch(() => null),
      ]);

      checkinSnaps.forEach((s, i) => {
        if (!s.exists) return;
        const c = s.data()!;
        const workoutsRaw: Record<string, unknown>[] = Array.isArray(c.workouts) && c.workouts.length ? c.workouts : c.workout?.done ? [c.workout] : [];
        const checkin: ClientDataCheckin = {
          waterGlasses: typeof c.waterGlasses === "number" ? c.waterGlasses : undefined,
          vegetablesServings: typeof c.vegetablesServings === "number" ? c.vegetablesServings : undefined,
          mood: typeof c.mood === "number" ? c.mood : undefined,
          steps: typeof c.steps === "number" ? c.steps : undefined,
          weightKg: typeof c.weightKg === "number" ? c.weightKg : undefined,
          notes: str(c.notes),
          workouts: workoutsRaw
            .filter((w) => w && (w.done === undefined || w.done === true))
            .map((w) => ({
              type: str(w.type, 60),
              intensity: str(w.intensity, 20),
              durationMinutes: typeof w.durationMinutes === "number" ? w.durationMinutes : undefined,
              distanceKm: typeof w.distanceKm === "number" ? w.distanceKm : undefined,
              description: str(w.description, 200),
              caloriesBurned: typeof w.caloriesBurned === "number" ? w.caloriesBurned : undefined,
            })),
          eatingWindow: c.eatingWindow && typeof c.eatingWindow.open === "string" ? { open: c.eatingWindow.open, close: String(c.eatingWindow.close ?? ""), durationHours: num(c.eatingWindow.durationHours) } : undefined,
          daySummary: c.daySummary && typeof c.daySummary.summary === "string"
            ? { summary: c.daySummary.summary.slice(0, 800), insights: Array.isArray(c.daySummary.insights) ? c.daySummary.insights.slice(0, 5).map((x: unknown) => String(x).slice(0, 300)) : [], tip: str(c.daySummary.tip, 300) ?? "" }
            : undefined,
        };
        const day = byDate.get(dates[i])!;
        day.checkin = checkin;
        if (checkin.steps != null) day.steps = Math.max(day.steps ?? 0, checkin.steps);
        if (checkin.weightKg != null) weightByDate.set(dates[i], checkin.weightKg);
      });

      stepsSnap?.docs.forEach((d) => {
        const e = d.data();
        const day = typeof e.date === "string" ? byDate.get(e.date) : undefined;
        if (day && typeof e.steps === "number") day.steps = Math.max(day.steps ?? 0, e.steps);
      });

      mealsSnap.docs.forEach((d) => {
        const m = d.data();
        const created: Date | undefined = m.createdAt?.toDate?.();
        const date: string | undefined = m.mealDate ?? (created ? israelDate(created) : undefined);
        const day = date ? byDate.get(date) : undefined;
        if (!day || !date || date < oldest) return;
        const a = m.analysis ?? {};
        const mm = a.menuMatch;
        const meal: ClientDataMeal = {
          id: d.id,
          mealType: String(m.mealType ?? "snack"),
          time: str(m.mealTime, 8),
          description: str(a.description, 300) ?? "",
          calories: num(a.calories),
          protein: num(a.protein),
          carbs: num(a.carbs),
          fat: num(a.fat),
          healthScore: typeof a.healthScore === "number" ? a.healthScore : undefined,
          notes: str(m.notes, 300),
          imageURL: typeof m.imageURL === "string" && m.imageURL.startsWith("https://") ? m.imageURL : undefined,
          menuMatch: mm && typeof mm.status === "string" ? { slot: str(mm.slot, 60), status: mm.status, score: num(mm.score), note: str(mm.note, 300) ?? "" } : undefined,
        };
        day.meals.push(meal);
        day.calories += meal.calories;
        day.protein += meal.protein;
        day.carbs += meal.carbs;
        day.fat += meal.fat;
      });

      weightSnap?.docs.forEach((d) => {
        const e = d.data();
        if (typeof e.date === "string" && typeof e.weightKg === "number") weightByDate.set(e.date, e.weightKg);
      });
    }

    for (const day of byDate.values()) {
      day.meals.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
      day.calories = Math.round(day.calories);
      day.protein = Math.round(day.protein);
      day.carbs = Math.round(day.carbs);
      day.fat = Math.round(day.fat);
      day.weightKg = weightByDate.get(day.date) ?? null;
    }

    const clientDoc = (await db.doc(`users/${clientId}`).get()).data() ?? {};
    const body: ClientDataResponse = {
      clientName: clientDoc.displayName ?? "",
      today,
      days: dates.map((d) => byDate.get(d)!),
      weights: [...weightByDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, kg]) => ({ date, kg })),
      targets: {
        calories: clientDoc.profile?.dailyCalorieTarget ?? null,
        steps: clientDoc.profile?.stepsGoal ?? null,
        weightKg: clientDoc.profile?.targetWeightKg || null,
        heightCm: clientDoc.profile?.heightCm || null,
      },
    };
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof MenuAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("client-data:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
