import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { isCoachActive } from "@/lib/subscription";
import { getCoachClientStatuses } from "@/lib/server/coachStatus";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** One status row per client of the authenticated dietitian (see lib/server/coachStatus). */
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  getAdminApp();
  const coachData = (await admin.firestore().doc(`users/${uid}`).get()).data() ?? {};
  if (!(coachData.accountType === "business" && isCoachActive(coachData.coach))) {
    return NextResponse.json({ error: "Coach plan inactive" }, { status: 403 });
  }

  const { today, clients } = await getCoachClientStatuses(uid);
  return NextResponse.json({ generatedAt: new Date().toISOString(), today, clients });
}
