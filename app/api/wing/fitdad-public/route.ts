import { NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { FIT_DAD_WING_MAX_MEMBERS } from "@/lib/subscription";

export const dynamic = "force-dynamic";

// Public fitDad pool wings, for onboarding's "pick a group" list (step 3 of
// the plan). Server-side via Admin SDK rather than a direct client Firestore
// query, since regular wing docs aren't otherwise readable by non-members —
// this avoids a firestore.rules change just for this one public-listing
// case. Only name/memberCount/capacity are exposed — low-sensitivity, no
// admin secret required (any signed-in user can see what groups exist to
// join, same as they could if this were rendered as a normal in-app list).
export async function GET() {
  try {
    getAdminApp();
    const db = admin.firestore();
    const snap = await db.collection("wings")
      .where("isFitDadWing", "==", true)
      .where("visibility", "==", "public")
      .get();

    const wings = snap.docs
      .map((d) => {
        const data = d.data();
        const memberIds: string[] = Array.isArray(data.memberIds) ? data.memberIds : [];
        const capacity: number = typeof data.capacity === "number" ? data.capacity : FIT_DAD_WING_MAX_MEMBERS;
        return { id: d.id, name: data.name ?? "—", memberCount: memberIds.length, capacity };
      })
      .filter((w) => w.memberCount < w.capacity); // full wings never show up

    return NextResponse.json({ wings });
  } catch (err) {
    console.error("fitdad-public list error:", err);
    return NextResponse.json({ wings: [] });
  }
}
