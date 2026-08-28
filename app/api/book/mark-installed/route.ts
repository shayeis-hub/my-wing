import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { getHabit, HABITS } from "@/lib/book/habits";

export const dynamic = "force-dynamic";

// Marks a habit installed and, if there's a next one in order, starts it too
// — the book's own rule ("when a habit passes that test, add the next one,
// not before") applied automatically so the reader never has to separately
// hit "start" on the next habit.
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId } = (await req.json()) as { habitId?: string };
  const habit = habitId ? getHabit(habitId) : undefined;
  if (!habit) return NextResponse.json({ error: "Unknown habitId" }, { status: 400 });

  getAdminApp();
  const db = admin.firestore();
  const userRef = db.doc(`users/${uid}`);
  const existing = (await userRef.get()).data()?.habitProgress ?? {};

  if (!existing[habitId!]) {
    return NextResponse.json({ error: "Habit not started" }, { status: 400 });
  }
  if (existing[habitId!].installedAt) {
    return NextResponse.json({ ok: true }); // already marked — no-op
  }

  const now = new Date().toISOString();
  const next = HABITS.find((h) => h.order === habit.order + 1);

  const update: Record<string, unknown> = {
    [`habitProgress.${habitId}.installedAt`]: now,
  };
  if (next && !existing[next.id]) {
    update[`habitProgress.${next.id}`] = { startedAt: now };
  }

  await userRef.update(update);

  return NextResponse.json({ ok: true, next: next?.id ?? null });
}
