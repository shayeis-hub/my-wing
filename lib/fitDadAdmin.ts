// Server-only helpers for the "Aba Chatuv" (fitDad) admin panel — account
// provisioning, the shared-secret auth check, and the small conversions
// (phone→password, plan→expiry) used by every route under
// app/api/admin/fitdad/*. See the plan at
// C:\Users\shay\.claude\plans\cached-exploring-tarjan.md for the full design.
import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { FIT_DAD_WING_MAX_MEMBERS } from "@/lib/subscription";

export type FitDadPlan = "3m" | "6m" | "12m";
export const FIT_DAD_PLANS: FitDadPlan[] = ["3m", "6m", "12m"];

/** Same shared-secret pattern as /api/admin/stats — an internal MVP tool, not a full admin-role system. Every write also takes a free-text `createdBy` for a lightweight audit trail. */
export function requireAdminSecret(req: NextRequest): NextResponse | null {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || !process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Digits only — deliberately NOT reformatted into E.164 or anything else,
 * because this string becomes the account's actual Firebase Auth password.
 * Whatever the customer is told to type back at login has to match exactly,
 * and "your password is your phone number, digits only" is what they'll be
 * told — reformatting it here would silently break login.
 */
export function normalizePhone(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export function expiresAtForPlan(plan: FitDadPlan, from: Date = new Date()): string {
  const months = plan === "3m" ? 3 : plan === "6m" ? 6 : 12;
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export interface FitDadRowInput {
  name: string;
  email: string;
  phone: string;
  plan: string;
  /** Existing fitDad wing id to join instead of opening a new private one. */
  wingId?: string;
}

export type FitDadRowError =
  | "MISSING_FIELDS"
  | "INVALID_PLAN"
  | "PHONE_TOO_SHORT"
  | "INVALID_EMAIL"
  | "EMAIL_EXISTS"
  | "WING_NOT_FOUND"
  | "FIT_DAD_WING_LIMIT_REACHED";

/** Validates one row without writing anything — shared by bulk-import's preview mode and as a pre-check inside provisionFitDadUser. */
export async function validateFitDadRow(row: FitDadRowInput): Promise<FitDadRowError | null> {
  if (!row.name?.trim() || !row.email?.trim() || !row.phone?.trim() || !row.plan) return "MISSING_FIELDS";
  if (!FIT_DAD_PLANS.includes(row.plan as FitDadPlan)) return "INVALID_PLAN";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) return "INVALID_EMAIL";
  if (normalizePhone(row.phone).length < 6) return "PHONE_TOO_SHORT";

  getAdminApp();
  const auth = admin.auth();
  try {
    await auth.getUserByEmail(row.email.trim().toLowerCase());
    return "EMAIL_EXISTS";
  } catch (e) {
    if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
  }

  if (row.wingId) {
    const db = admin.firestore();
    const wingSnap = await db.collection("wings").doc(row.wingId).get();
    if (!wingSnap.exists || wingSnap.data()?.isFitDadWing !== true) return "WING_NOT_FOUND";
    const wingData = wingSnap.data()!;
    const memberIds: string[] = Array.isArray(wingData.memberIds) ? wingData.memberIds : [];
    const capacity: number = typeof wingData.capacity === "number" ? wingData.capacity : FIT_DAD_WING_MAX_MEMBERS;
    if (memberIds.length >= capacity) return "FIT_DAD_WING_LIMIT_REACHED";
  }
  return null;
}

/**
 * Creates the Firebase Auth account (password = phone, see normalizePhone),
 * the Firestore user doc (empty profile stub → the regular onboarding flow
 * picks it up, per step 3 of the plan). By default NO wing is assigned —
 * the customer picks public pool vs. their own private group themselves,
 * during their own onboarding (that's the whole point of step 3; the admin
 * panel doesn't get to make that call for them). Passing `row.wingId` is an
 * explicit override for when ops already knows where someone belongs (e.g.
 * seating two friends who signed up together into the same wing) — it joins
 * that wing immediately instead, skipping the onboarding choice for them.
 * Re-validates (the preview call and the actual write are two separate
 * requests — the row could have changed, or someone could have filled the
 * target wing, in between).
 */
export async function provisionFitDadUser(
  row: FitDadRowInput,
  createdBy: string
): Promise<{ uid: string; wingId: string | null; password: string }> {
  const validationError = await validateFitDadRow(row);
  if (validationError) throw Object.assign(new Error(validationError), { code: validationError });

  getAdminApp();
  const db = admin.firestore();
  const auth = admin.auth();

  const email = row.email.trim().toLowerCase();
  const name = row.name.trim();
  const password = normalizePhone(row.phone);
  const plan = row.plan as FitDadPlan;

  const userRecord = await auth.createUser({ email, password, displayName: name });
  const uid = userRecord.uid;

  let wingId: string | null = null;
  if (row.wingId) {
    wingId = row.wingId;
    await db.collection("wings").doc(wingId).update({
      memberIds: admin.firestore.FieldValue.arrayUnion(uid),
      members: admin.firestore.FieldValue.arrayUnion({ uid, displayName: name }),
    });
  }

  await db.collection("users").doc(uid).set({
    email,
    displayName: name,
    ...(wingId ? { wingId, wingIds: [wingId] } : {}),
    profile: {
      age: 0, heightCm: 0, weightKg: 0, targetWeightKg: 0,
      gender: "male", activityLevel: "sedentary", dailyCalorieTarget: 0,
    },
    fitDadAccess: { active: true, expiresAt: expiresAtForPlan(plan), plan, createdBy },
    mustChangePassword: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { uid, wingId, password };
}
