import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
// Anthropic client retries up to 4x on overload (529) with backoff — multi-image
// analysis + a slow retry chain can exceed Vercel's default 10s timeout.
export const maxDuration = 60;
import { analyzeMealImage, analyzeMealImages, analyzeMealText } from "@/lib/ai/claude";
import { isGrandfathered, isPremium, canAddMealPhoto, FREE_LIMITS, type Plan, type AccessGrants } from "@/lib/subscription";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";

// ── Admin-SDK helpers (server-safe, no client SDK) ────────────────────────────

type SubDoc = { plan: Plan; cancelPending?: boolean; expiresAt?: { _seconds?: number } | null };
type CourseAccess = { expiresAt: string; wingId: string };
type CoachAccess = { active?: boolean };
type BookAccess = { active?: boolean; grantedBy?: string };
type FitDadAccess = { active?: boolean; expiresAt?: string };
type UserDoc = { email?: string; subscription?: SubDoc; courseAccess?: CourseAccess; coachAccess?: CoachAccess; bookAccess?: BookAccess; fitDadAccess?: FitDadAccess };

async function getUserPlanAdmin(
  uid: string
): Promise<{ email: string; sub: SubDoc | null; grants: AccessGrants }> {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  if (!snap.exists) return { email: "", sub: null, grants: {} };
  const data = snap.data() as UserDoc;
  return {
    email: data.email ?? "",
    sub: data.subscription ?? null,
    // Bundled so a future access type doesn't need a new destructured field
    // at every call site below — see lib/subscription.ts's AccessGrants doc.
    grants: {
      courseAccess: data.courseAccess ?? null,
      coachAccess: data.coachAccess ?? null,
      bookAccess: data.bookAccess ?? null,
      fitDadAccess: data.fitDadAccess ?? null,
    },
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
  // `userId`/`userEmail` used to be trusted straight from the request body —
  // an unauthenticated caller could run meal analysis for free (this calls
  // the Claude API — a real per-request cost), and/or dodge the daily-photo
  // quota entirely by sending someone else's userId (or none) so the limit
  // check ran against a different account than the one actually asking for
  // analysis (found via QA, 2026-09). The verified token's uid — and the
  // email/plan/grants looked up from ITS OWN Firestore doc, below — are now
  // the only sources of truth.
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    let { base64Image, mediaType } = body;
    const { base64Images, hint, previousAnalysis, textDescription, lang, imageUrl } = body;

    getAdminApp();
    const { email: userEmail, sub, grants } = await getUserPlanAdmin(uid);
    const plan = sub?.plan ?? "free";
    const today = format(new Date(), "yyyy-MM-dd");
    const grandfathered = isGrandfathered(userEmail);
    const premium = isPremium(userEmail, plan, sub, grants);

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
    // Applies to BOTH single-image and multi-image analysis — the
    // multi-image path used to skip this check entirely (found via QA,
    // 2026-09), so submitting several photos at once bypassed the quota.
    const isImageAnalysis = !!base64Image || (Array.isArray(base64Images) && base64Images.length > 0);
    if (isImageAnalysis && !grandfathered && !premium) {
      const todayCount = await getDailyMealCountAdmin(uid, today);
      if (!canAddMealPhoto(userEmail, plan, todayCount, grants)) {
        return NextResponse.json(
          { error: "MEAL_LIMIT_REACHED", limit: FREE_LIMITS.mealPhotosPerDay },
          { status: 403 }
        );
      }
    }

    // ── Text analysis (manual entry / voice, or a saved meal with no photo) ───
    if (textDescription) {
      const analysis = await analyzeMealText(textDescription, lang ?? "he");
      return NextResponse.json(analysis);
    }

    // ── Multi-image analysis ───────────────────────────────────────────────────
    if (base64Images && Array.isArray(base64Images) && base64Images.length > 0) {
      const analysis = await analyzeMealImages(base64Images, hint, lang ?? "he", previousAnalysis);
      if (!grandfathered && !premium) await incrementDailyMealCountAdmin(uid, today);
      return NextResponse.json(analysis);
    }

    if (!base64Image || !mediaType) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const analysis = await analyzeMealImage(base64Image, mediaType, hint, lang ?? "he", previousAnalysis);

    // ── Increment daily count after successful analysis ────────────────────────
    if (!grandfathered && !premium) {
      await incrementDailyMealCountAdmin(uid, today);
    }

    return NextResponse.json(analysis);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Meal analysis error:", msg);
    return NextResponse.json({ error: "Analysis failed", detail: msg }, { status: 500 });
  }
}
