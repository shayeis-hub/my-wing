import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Finishes a challenge and awards trophies — moved server-side (Admin SDK,
 * one atomic batch) from lib/firebase/firestore.ts's finishChallenge, which
 * did this as 2+N sequential client writes: mark the challenge finished,
 * clear the wing's activeChallenge, then loop awarding a trophy to each of
 * up to 3 winners via a direct write to THEIR OWN users/{uid} doc.
 *
 * That last part could never actually work for any winner other than
 * whoever clicked "finish" — firestore.rules only lets you write your own
 * user doc, so the trophy write for every other winner was silently
 * rejected AFTER the challenge had already been marked finished and the
 * wing's activeChallenge already cleared, leaving a permanently broken
 * partial state for any challenge with more than one real winner (found
 * via QA, 2026-09). A single Admin-SDK batch fixes both problems: it can
 * legitimately write to other users' docs, and it's atomic (all of it
 * commits together, or none of it does).
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { wingId, challengeId, progress } = await req.json();
    if (!wingId || !challengeId || typeof progress !== "object" || progress === null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();

    const wingRef = db.collection("wings").doc(wingId);
    const wingSnap = await wingRef.get();
    if (!wingSnap.exists) return NextResponse.json({ error: "Wing not found" }, { status: 404 });
    const wingData = wingSnap.data()!;
    const memberIds: string[] = Array.isArray(wingData.memberIds) ? wingData.memberIds : [];
    if (!memberIds.includes(uid)) {
      return NextResponse.json({ error: "Not a member of this wing" }, { status: 403 });
    }

    const challengeRef = wingRef.collection("challenges").doc(challengeId);
    const challengeSnap = await challengeRef.get();
    if (!challengeSnap.exists) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    const challenge = challengeSnap.data()!;
    if (challenge.status === "finished") {
      return NextResponse.json({ error: "Already finished" }, { status: 409 }); // idempotency guard
    }

    const members: { uid: string; [k: string]: unknown }[] = Array.isArray(wingData.members) ? wingData.members : [];
    const sorted = [...members].sort(
      (a, b) => (progress[b.uid] ?? 0) - (progress[a.uid] ?? 0)
    );
    const medals = ["gold", "silver", "bronze"] as const;
    const winners = sorted.slice(0, 3).map((m) => m.uid);

    const batch = db.batch();
    batch.update(challengeRef, { status: "finished", winners });
    // Only clear activeChallenge if it's still THIS challenge — a different
    // one could have started since the client last read the wing doc.
    if (wingData.activeChallenge?.id === challengeId) {
      batch.update(wingRef, { activeChallenge: null });
    }
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      const member = sorted[i];
      if (!progress[member.uid]) continue; // skip if no progress at all
      const trophy = {
        challengeId,
        challengeTitle: challenge.title,
        challengeType: challenge.type,
        medal: medals[i],
        endDate: challenge.endDate,
        wingId,
      };
      batch.update(db.collection("users").doc(member.uid), {
        trophies: admin.firestore.FieldValue.arrayUnion(trophy),
      });
    }
    await batch.commit();

    return NextResponse.json({ winners });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("finish-challenge error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
