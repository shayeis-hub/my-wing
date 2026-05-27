import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
import { analyzeMealImage, analyzeMealText } from "@/lib/ai/claude";
import { isGrandfathered, isPremium, canAddMealPhoto, FREE_LIMITS } from "@/lib/subscription";
import { getDailyMealCount, incrementDailyMealCount, getUserPlan } from "@/lib/firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mediaType, hint, textDescription, userId, userEmail, lang } = await req.json();

    // ── Enforce meal-photo limit (only for image analysis, not text) ──────────
    if (base64Image && userId && userEmail !== undefined) {
      // Grandfathered users always pass
      if (!isGrandfathered(userEmail)) {
        const today = format(new Date(), "yyyy-MM-dd");
        const sub = await getUserPlan(userId);
        const plan = sub?.plan ?? "free";

        if (!isPremium(userEmail, plan)) {
          const todayCount = await getDailyMealCount(userId, today);
          if (!canAddMealPhoto(userEmail, plan, todayCount)) {
            return NextResponse.json(
              { error: "MEAL_LIMIT_REACHED", limit: FREE_LIMITS.mealPhotosPerDay },
              { status: 403 }
            );
          }
        }
      }
    }

    // ── Text analysis (manual entry) — no limit ───────────────────────────────
    if (textDescription) {
      const analysis = await analyzeMealText(textDescription, lang ?? "he");
      return NextResponse.json(analysis);
    }

    if (!base64Image || !mediaType) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const analysis = await analyzeMealImage(base64Image, mediaType, hint, lang ?? "he");

    // ── Increment daily count after successful analysis ────────────────────────
    if (userId && userEmail !== undefined && !isGrandfathered(userEmail)) {
      const today = format(new Date(), "yyyy-MM-dd");
      const sub = await getUserPlan(userId);
      const plan = sub?.plan ?? "free";
      if (!isPremium(userEmail, plan)) {
        await incrementDailyMealCount(userId, today);
      }
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Meal analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
