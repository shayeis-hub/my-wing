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
 *
 * `progress` is no longer taken from the request body — any member could
 * finish an active challenge early and submit a fabricated progress object
 * to win their own gold medal (found via QA, 2026-09). Recomputed
 * server-side instead, mirroring app/(app)/challenges/[id]/page.tsx's own
 * computeProgress(challenge, "total"): auto-tracked types (steps/water/
 * vegetables) are summed fresh from the real steps/checkins subcollections
 * over the challenge's date range — challenge.progress is never actually
 * kept in sync for those types, it's only ever computed on demand, so
 * trusting the stored field for them would silently zero everyone out.
 * Manual types (no_sugar/other/legacy calories) DO keep a real running
 * total in challenge.progress (written by updateChallengeProgress, which
 * firestore.rules restricts to each member writing only their own entry),
 * so that's used as-is for those.
 */
async function computeProgressServer(
  db: admin.firestore.Firestore,
  wingId: string,
  challenge: FirebaseFirestore.DocumentData
): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  if (challenge.type === "steps") {
    const snap = await db.collection("wings").doc(wingId).collection("steps")
      .where("date", ">=", challenge.startDate).where("date", "<=", challenge.endDate).get();
    snap.docs.forEach((d) => {
      const data = d.data();
      map[data.userId] = (map[data.userId] ?? 0) + (data.steps ?? 0);
    });
  } else if (challenge.type === "water" || challenge.type === "vegetables") {
    const snap = await db.collection("wings").doc(wingId).collection("checkins")
      .where("date", ">=", challenge.startDate).where("date", "<=", challenge.endDate).get();
    snap.docs.forEach((d) => {
      const data = d.data();
      const val = challenge.type === "water" ? (data.waterGlasses ?? 0) : (data.vegetablesServings ?? 0);
      map[data.userId] = (map[data.userId] ?? 0) + val;
    });
  } else {
    Object.assign(map, challenge.progress ?? {}); // manual types keep a single running number
  }
  return map;
}
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { wingId, challengeId } = await req.json();
    if (!wingId || !challengeId) {
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
    const progress = await computeProgressServer(db, wingId, challenge);

    const members: { uid: string; [k: string]: unknown }[] = Array.isArray(wingData.members) ? wingData.members : [];
    // Zero-progress members are excluded from medal contention entirely —
    // not just skipped in place — so the client's winners[0]/[1]/[2]
    // positional gold/silver/bronze display always matches the actual medal
    // saved to that member's trophies. The old version kept zero-progress
    // members in their raw rank position and just skipped awarding THEM a
    // trophy, which could silver-medal the real top scorer while the UI
    // (indexed by position) showed them gold, or show a lone zero-progress
    // member as "1st place" with no trophy ever actually saved (found via
    // QA, 2026-09 — a 1-step-goal challenge nobody walked).
    const eligible = members
      .filter((m) => progress[m.uid])
      .sort((a, b) => progress[b.uid] - progress[a.uid])
      .slice(0, 3);
    const medals = ["gold", "silver", "bronze"] as const;
    const winners = eligible.map((m) => m.uid);

    const batch = db.batch();
    batch.update(challengeRef, { status: "finished", winners });
    // Only clear activeChallenge if it's still THIS challenge — a different
    // one could have started since the client last read the wing doc.
    if (wingData.activeChallenge?.id === challengeId) {
      batch.update(wingRef, { activeChallenge: null });
    }
    for (let i = 0; i < eligible.length; i++) {
      const member = eligible[i];
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
