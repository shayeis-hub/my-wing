import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

// Temporary debug endpoint — protected by CRON_SECRET.
// Lists every encouragement/comment/reaction on every doc belonging to a user.
// Remove after diagnosing the "I got a push but can't find the comment" bug.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Missing ?email" }, { status: 400 });
  }

  getAdminApp();
  const db = admin.firestore();

  // Resolve user
  const userSnap = await db.collection("users").where("email", "==", email).limit(1).get();
  if (userSnap.empty) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userDoc = userSnap.docs[0];
  const uid = userDoc.id;
  const data = userDoc.data();
  const wingId = data.wingId as string | undefined;
  if (!wingId) return NextResponse.json({ uid, error: "No wingId" }, { status: 404 });

  // Walk last 14 days of checkins
  const today = new Date();
  const checkins: Array<{ date: string; encouragements: { from: string; text: string }[]; reactions: number }> = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today.getTime() - i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const id = `${uid}_${dateStr}`;
    const doc = await db.doc(`wings/${wingId}/checkins/${id}`).get();
    if (!doc.exists) continue;
    const cd = doc.data() ?? {};
    const encs = (cd.encouragements ?? []) as Array<{ authorName: string; text: string }>;
    const reactions = (cd.reactions ?? []) as unknown[];
    if (encs.length === 0 && reactions.length === 0) continue;
    checkins.push({
      date: dateStr,
      encouragements: encs.map((e) => ({ from: e.authorName, text: e.text })),
      reactions: reactions.length,
    });
  }

  // Find all of user's meals with comments or reactions
  const mealsSnap = await db.collection(`wings/${wingId}/meals`).where("userId", "==", uid).get();
  const meals: Array<{ id: string; date: string | null; description: string; comments: { from: string; text: string }[]; reactions: number }> = [];
  for (const m of mealsSnap.docs) {
    const md = m.data();
    const comments = (md.comments ?? []) as Array<{ authorName: string; text: string }>;
    const reactions = (md.reactions ?? []) as unknown[];
    if (comments.length === 0 && reactions.length === 0) continue;
    meals.push({
      id: m.id,
      date: (md.mealDate as string) ?? md.createdAt?.toDate?.()?.toISOString()?.split("T")[0] ?? null,
      description: md.analysis?.description ?? "",
      comments: comments.map((c) => ({ from: c.authorName, text: c.text })),
      reactions: reactions.length,
    });
  }

  // Wing posts where this user is the author — check if anyone reacted/commented
  const postsSnap = await db.collection(`wings/${wingId}/posts`).where("userId", "==", uid).get();
  const posts: Array<{ id: string; comments: { from: string; text: string }[]; reactions: number }> = [];
  for (const p of postsSnap.docs) {
    const pd = p.data();
    const comments = (pd.comments ?? []) as Array<{ authorName: string; text: string }>;
    const reactions = (pd.reactions ?? []) as unknown[];
    if (comments.length === 0 && reactions.length === 0) continue;
    posts.push({
      id: p.id,
      comments: comments.map((c) => ({ from: c.authorName, text: c.text })),
      reactions: reactions.length,
    });
  }

  return NextResponse.json({
    uid,
    wingId,
    displayName: data.displayName,
    checkins,
    meals,
    posts,
  });
}
