import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { format, subDays } from "date-fns";

export const dynamic = "force-dynamic";

async function safeCount(query: FirebaseFirestore.Query): Promise<number> {
  try {
    const snap = await query.count().get();
    return snap.data().count;
  } catch {
    // Fallback: fetch docs and count manually (slower but works without index)
    try {
      const snap = await query.get();
      return snap.size;
    } catch {
      return -1; // unavailable
    }
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || !process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    getAdminApp();
    const db = admin.firestore();

    const now      = new Date();
    const weekAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStr   = format(now, "yyyy-MM-dd");
    const weekAgoStr = format(subDays(now, 7), "yyyy-MM-dd");

    // ── Users ────────────────────────────────────────────────────────────────
    type RawUser = {
      id: string;
      displayName?: string;
      email?: string;
      wingId?: string;
      subscription?: { plan?: string };
      createdAt?: { _seconds?: number } | null;
    };

    let users: RawUser[] = [];
    try {
      const snap = await db.collection("users").orderBy("createdAt", "desc").get();
      users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RawUser));
    } catch {
      // orderBy may fail if index not ready — fall back to unsorted
      const snap = await db.collection("users").get();
      users = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as RawUser))
        .sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));
    }

    const totalUsers    = users.length;
    const newUsersWeek  = users.filter((u) => (u.createdAt?._seconds ?? 0) >= weekAgo.getTime()  / 1000).length;
    const newUsersMonth = users.filter((u) => (u.createdAt?._seconds ?? 0) >= monthAgo.getTime() / 1000).length;
    const premiumUsers  = users.filter((u) => u.subscription?.plan === "premium" || u.subscription?.plan === "grandfathered").length;
    const freeUsers     = totalUsers - premiumUsers;

    const recentUsers = users.slice(0, 10).map((u) => ({
      uid:         u.id,
      displayName: u.displayName ?? "—",
      email:       u.email ?? "—",
      plan:        u.subscription?.plan ?? "free",
      hasWing:     !!u.wingId,
      createdAt:   u.createdAt?._seconds
        ? new Date(u.createdAt._seconds * 1000).toISOString()
        : null,
    }));

    // ── Wings ────────────────────────────────────────────────────────────────
    type RawWing = {
      id: string;
      name?: string;
      ownerId?: string;
      memberIds?: string[];
      createdAt?: { _seconds?: number } | null;
    };

    let wings: RawWing[] = [];
    try {
      const snap = await db.collection("wings").orderBy("createdAt", "desc").get();
      wings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RawWing));
    } catch {
      const snap = await db.collection("wings").get();
      wings = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as RawWing))
        .sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));
    }

    const totalWings   = wings.length;
    const newWingsWeek = wings.filter((w) => (w.createdAt?._seconds ?? 0) >= weekAgo.getTime() / 1000).length;

    // Wing owner name lookup (only for the 5 most recent)
    const ownerIds = [...new Set(wings.slice(0, 5).map((w) => w.ownerId).filter(Boolean) as string[])];
    const ownerDocs = await Promise.all(ownerIds.map((uid) => db.doc(`users/${uid}`).get()));
    const ownerNames: Record<string, string> = {};
    ownerDocs.forEach((d) => {
      if (d.exists) ownerNames[d.id] = (d.data() as { displayName?: string }).displayName ?? d.id.slice(0, 8);
    });

    const recentWings = wings.slice(0, 5).map((w) => ({
      id:          w.id,
      name:        w.name ?? "—",
      memberCount: w.memberIds?.length ?? 0,
      ownerName:   ownerNames[w.ownerId ?? ""] ?? "—",
      createdAt:   w.createdAt?._seconds
        ? new Date(w.createdAt._seconds * 1000).toISOString()
        : null,
    }));

    // Wing size distribution
    const sizeDistribution = { solo: 0, small: 0, medium: 0, large: 0 };
    wings.forEach((w) => {
      const n = w.memberIds?.length ?? 0;
      if      (n <= 1) sizeDistribution.solo++;
      else if (n <= 3) sizeDistribution.small++;
      else if (n <= 6) sizeDistribution.medium++;
      else             sizeDistribution.large++;
    });

    // ── Activity ─────────────────────────────────────────────────────────────
    const [checkinsToday, mealsToday, checkinsWeek, mealsWeek] = await Promise.all([
      safeCount(db.collectionGroup("checkins").where("date", "==", todayStr)),
      safeCount(db.collectionGroup("meals").where("mealDate", "==", todayStr)),
      safeCount(db.collectionGroup("checkins").where("date", ">=", weekAgoStr)),
      safeCount(db.collectionGroup("meals").where("mealDate", ">=", weekAgoStr)),
    ]);

    return NextResponse.json({
      users:    { total: totalUsers, newThisWeek: newUsersWeek, newThisMonth: newUsersMonth, premium: premiumUsers, free: freeUsers, recent: recentUsers },
      wings:    { total: totalWings, newThisWeek: newWingsWeek, sizeDistribution, recent: recentWings },
      activity: { checkinsToday, mealsToday, checkinsWeek, mealsWeek },
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Admin stats error:", msg);
    return NextResponse.json({ error: "Internal error", detail: msg }, { status: 500 });
  }
}
