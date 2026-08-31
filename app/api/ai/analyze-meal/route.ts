import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
// Anthropic client retries up to 4x on overload (529) with backoff — multi-image
// analysis + a slow retry chain can exceed Vercel's default 10s timeout.
export const maxDuration = 60;
import { analyzeMealImage, analyzeMealImages, analyzeMealText } from "@/lib/ai/claude";
import { isGrandfathered, isPremium, canAddMealPhoto, FREE_LIMITS, type Plan } from "@/lib/subscription";
import { admin, getAdminApp } from "@/lib/firebase/admin";

// ── Admin-SDK helpers (server-safe, no client SDK) ────────────────────────────

type SubDoc = { plan: Plan; cancelPending?: boolean; expiresAt?: { _seconds?: number } | null };
type CourseAccess = { expiresAt: string; wingId: string };
type BookAccess = { active?: boolean; grantedBy?: string };
type UserDoc = { subscription?: SubDoc; courseAccess?: CourseAccess; bookAccess?: BookAccess };

async function getUserPlanAdmin(
  uid: string
): Promise<{ sub: SubDoc | null; courseAccess: CourseAccess | null; bookAccess: BookAccess | null }> {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  if (!snap.exists) return { sub: null, courseAccess: null, bookAccess: null };
  const data = snap.data() as UserDoc;
  return {
    sub: data.subscription ?? null,
    courseAccess: data.courseAccess ?? null,
    bookAccess: data.bookAccess ?? null,
  };
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

// Fetches an already-uploaded meal photo (Firebase Storage URL) server-side
// and returns it as base64 — used when reanalyzing a SAVED meal, where the
// browser only has the URL, not the original file. Server-to-server fetch
// avoids the CORS restrictions a client-side fetch/canvas would hit.
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const mediaType: "image/jpeg" | "image/png" | "image/webp" =
      contentType.includes("png") ? "image/png" : contentType.includes("webp") ? "image/webp" : "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString("base64"), mediaType };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { base64Image, mediaType } = body;
    const { base64Images, hint, previousAnalysis, textDescription, userId, userEmail, lang, imageUrl } = body;

    // Reanalyzing a SAVED meal: the client only has the Storage URL, not the
    // original file, so fetch and encode it server-side.
    if (!base64Image && !base64Images && imageUrl) {
      const fetched = await fetchImageAsBase64(imageUrl);
      if (fetched) {
        base64Image = fetched.base64;
        mediaType = fetched.mediaType;
      }
    }

    // ── Enforce meal-photo limit (only for image analysis, not text) ──────────
    if (base64Image && userId && userEmail !== undefined) {
      getAdminApp();
      // Grandfathered users always pass
      if (!isGrandfathered(userEmail)) {
        const today = format(new Date(), "yyyy-MM-dd");
        const { sub, courseAccess, bookAccess } = await getUserPlanAdmin(userId);
        const plan = sub?.plan ?? "free";

        if (!isPremium(userEmail, plan, sub, courseAccess, undefined, bookAccess)) {
          const todayCount = await getDailyMealCountAdmin(userId, today);
          if (!canAddMealPhoto(userEmail, plan, todayCount, bookAccess)) {
            return NextResponse.json(
              { error: "MEAL_LIMIT_REACHED", limit: FREE_LIMITS.mealPhotosPerDay },
              { status: 403 }
            );
          }
        }
      }
    }

    // ── Text analysis (manual entry / voice, or a saved meal with no photo) ───
    if (textDescription) {
      getAdminApp();
      const analysis = await analyzeMealText(textDescription, lang ?? "he");
      return NextResponse.json(analysis);
    }

    // ── Multi-image analysis ───────────────────────────────────────────────────
    if (base64Images && Array.isArray(base64Images) && base64Images.length > 0) {
      const analysis = await analyzeMealImages(base64Images, hint, lang ?? "he", previousAnalysis);
      return NextResponse.json(analysis);
    }

    if (!base64Image || !mediaType) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const analysis = await analyzeMealImage(base64Image, mediaType, hint, lang ?? "he", previousAnalysis);

    // ── Increment daily count after successful analysis ────────────────────────
    if (userId && userEmail !== undefined && !isGrandfathered(userEmail)) {
      const today = format(new Date(), "yyyy-MM-dd");
      const { sub, courseAccess, bookAccess } = await getUserPlanAdmin(userId);
      const plan = sub?.plan ?? "free";
      if (!isPremium(userEmail, plan, sub, courseAccess, undefined, bookAccess)) {
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
