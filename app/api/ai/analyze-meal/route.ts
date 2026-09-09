import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
// Anthropic client retries up to 4x on overload (529) with backoff — multi-image
// analysis + a slow retry chain can exceed Vercel's default 10s timeout.
export const maxDuration = 60;
import { analyzeMealImage, analyzeMealImages, analyzeMealText } from "@/lib/ai/claude";
import { isGrandfathered, isPremium, FREE_LIMITS, type Plan, type AccessGrants } from "@/lib/subscription";
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

// Reserves `amount` toward today's photo quota atomically (read-check-write
// in one transaction) — the old check-then-increment-later pattern had a
// TOCTOU race: two concurrent requests could each read the same "under
// limit" count and both proceed, together exceeding it (found via QA,
// 2026-09). Returns false (writes nothing) if the reservation wouldn't fit.
// Also now counts a multi-image submission's actual size, not a flat 1 —
// same finding: a 5-photo batch used to cost exactly as much quota as one.
async function reserveMealQuota(uid: string, date: string, amount: number): Promise<boolean> {
  const ref = admin.firestore().doc(`users/${uid}/dailyUsage/${date}`);
  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.data() as { mealPhotos?: number } | undefined)?.mealPhotos ?? 0;
    if (current + amount > FREE_LIMITS.mealPhotosPerDay) return false;
    tx.set(ref, { mealPhotos: admin.firestore.FieldValue.increment(amount), date }, { merge: true });
    return true;
  });
}

// Gives back a reservation if the analysis call itself failed after — a
// user shouldn't lose quota for a request that never actually produced a result.
async function releaseMealQuota(uid: string, date: string, amount: number): Promise<void> {
  await admin.firestore().doc(`users/${uid}/dailyUsage/${date}`)
    .set({ mealPhotos: admin.firestore.FieldValue.increment(-amount) }, { merge: true })
    .catch(() => { /* best-effort — a failed release just costs the user one grace photo, not worth failing the request over */ });
}

// Server-side cap matching the client's own multi-image limit
// (app/(app)/meals/page.tsx caps at 5) — without this, one request could
// claim to submit an unbounded number of images while the old flat "-1
// per request" quota cost made that nearly free.
const MAX_IMAGES_PER_REQUEST = 5;

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

    if (Array.isArray(base64Images) && base64Images.length > MAX_IMAGES_PER_REQUEST) {
      return NextResponse.json({ error: "TOO_MANY_IMAGES", limit: MAX_IMAGES_PER_REQUEST }, { status: 400 });
    }

    // ── Reserve the meal-photo quota atomically, up front (only for image
    // analysis, not text) — applies to BOTH single-image and multi-image
    // analysis, counting the real number of images either way (both were
    // findings via QA, 2026-09: the multi-image path skipped this check
    // entirely, and even single-image had a check-then-increment-later gap
    // two concurrent requests could both slip through). Reserving before
    // the (slow, costly) AI call means a request that turns out to fail
    // never should have held the quota — released in the catch below.
    const imageCount = base64Image ? 1 : (Array.isArray(base64Images) ? base64Images.length : 0);
    const needsQuota = imageCount > 0 && !grandfathered && !premium;
    if (needsQuota) {
      const reserved = await reserveMealQuota(uid, today, imageCount);
      if (!reserved) {
        return NextResponse.json(
          { error: "MEAL_LIMIT_REACHED", limit: FREE_LIMITS.mealPhotosPerDay },
          { status: 403 }
        );
      }
    }

    try {
      // ── Text analysis (manual entry / voice, or a saved meal with no photo)
      if (textDescription) {
        const analysis = await analyzeMealText(textDescription, lang ?? "he");
        return NextResponse.json(analysis);
      }

      // ── Multi-image analysis ─────────────────────────────────────────────
      if (base64Images && Array.isArray(base64Images) && base64Images.length > 0) {
        const analysis = await analyzeMealImages(base64Images, hint, lang ?? "he", previousAnalysis);
        return NextResponse.json(analysis);
      }

      if (!base64Image || !mediaType) {
        if (needsQuota) await releaseMealQuota(uid, today, imageCount); // reserved but never actually used
        return NextResponse.json({ error: "Missing image data" }, { status: 400 });
      }

      const analysis = await analyzeMealImage(base64Image, mediaType, hint, lang ?? "he", previousAnalysis);
      return NextResponse.json(analysis);
    } catch (err) {
      if (needsQuota) await releaseMealQuota(uid, today, imageCount);
      throw err;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Meal analysis error:", msg);
    return NextResponse.json({ error: "Analysis failed", detail: msg }, { status: 500 });
  }
}
