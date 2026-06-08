import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
import { analyzeMealImage, analyzeMealImages, analyzeMealText } from "@/lib/ai/claude";
import { isGrandfathered, isPremium, canAddMealPhoto, FREE_LIMITS, type Plan } from "@/lib/subscription";
import { admin, getAdminApp } from "@/lib/firebase/admin";

// ── Admin-SDK helpers (server-safe, no client SDK) ────────────────────────────

type SubDoc = { plan: Plan; cancelPending?: boolean; expiresAt?: { _seconds?: number } | null };

async function getUserPlanAdmin(uid: string): Promise<SubDoc | null> {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  return (snap.data() as { subscription?: SubDoc }).subscription ?? null;
}

async function getDailyMealCountAdmin(uid: string, date: string): Promise<number> {
  const snap = await admin.firestore().doc(`users/${uid}/dailyUsage/${date}`).get();
  if (!snap.exists) return 0;
  return (snap.data() as { mealPhotos?: number }).mealPhotos ?? 0;
}

async function incrementDailyMealCountAdmin(uid: string, date: string): Promise<void> {
  const ref = admin.firestore().doc(`users/${uid}/dailyUsage/${date}`);
  await ref.set({ mealPhotos: admin.firestore.FieldValue.increment(1), date }, { merge: true });
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { base64Image, base64Images, mediaType, hint, textDescription, userId, userEmail, lang } = await req.json();

    // ── Enforce meal-photo limit (only for image analysis, not text) ──────────
    if (base64Image && userId && userEmail !== undefined) {
      getAdminApp();
      // Grandfathered users always pass
      if (!isGrandfathered(userEmail)) {
        const today = format(new Date(), "yyyy-MM-dd");
        const sub = await getUserPlanAdmin(userId);
        const plan = sub?.plan ?? "free";

        if (!isPremium(userEmail, plan, sub)) {
          const todayCount = await getDailyMealCountAdmin(userId, today);
          if (!canAddMealPhoto(userEmail, plan, todayCount)) {
            return NextResponse.json(
              { error: "MEAL_LIMIT_REACHED", limit: FREE_LIMITS.mealPhotosPerDay },
              { status: 403 }
            );
          }
        }
      }
    }

    // ── Text analysis (manual entry / voice) — no limit ───────────────────────
    if (textDescription) {
      getAdminApp();
      const analysis = await analyzeMealText(textDescription, lang ?? "he");
      return NextResponse.json(analysis);
    }

    // ── Multi-image analysis ───────────────────────────────────────────────────
    if (base64Images && Array.isArray(base64Images) && base64Images.length > 0) {
      const analysis = await analyzeMealImages(base64Images, hint, lang ?? "he");
      return NextResponse.json(analysis);
    }

    if (!base64Image || !mediaType) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const analysis = await analyzeMealImage(base64Image, mediaType, hint, lang ?? "he");

    // ── Increment daily count after successful analysis ────────────────────────
    if (userId && userEmail !== undefined && !isGrandfathered(userEmail)) {
      const today = format(new Date(), "yyyy-MM-dd");
      const sub = await getUserPlanAdmin(userId);
      const plan = sub?.plan ?? "free";
      if (!isPremium(userEmail, plan, sub)) {
        await incrementDailyMealCountAdmin(userId, today);
      }
    }

    return NextResponse.json(analysis);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Meal analysis error:", msg);
    return NextResponse.json({ error: "Analysis failed", detail: msg }, { status: 500 });
  }
}
