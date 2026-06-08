import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { format, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    getAdminApp();
    const db = admin.firestore();

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStr = format(now, "yyyy-MM-dd");
    const weekAgoStr = format(subDays(now, 7), "yyyy-MM-dd");

    // ── Users ────────────────────────────────────────────────────────────────
    const usersSnap = await db.collection("users").orderBy("createdAt", "desc").get();
    type RawUser = {
      id: string;
      displayName?: string;
      email?: string;
      wingId?: string;
      subscription?: { plan?: string; expiresAt?: { _seconds: number } | null; cancelPending?: boolean };
      createdAt?: { _seconds: number } | null;
    };
    const users: RawUser[] = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RawUser));

    const totalUsers    = users.length;
    const newUsersWeek  = users.filter((u) => (u.createdAt?._seconds ?? 0) >= weekAgo.getTime() / 1000).length;
    const newUsersMonth = users.filter((u) => (u.createdAt?._seconds ?? 0) >= monthAgo.getTime() / 1000).length;
    const premiumUsers  = users.filter((u) => u.subscription?.plan === "premium" || u.subscription?.plan === "grandfathered").length;
    const freeUsers     = totalUsers - premiumUsers;

    const recentUsers = users.slice(0, 10).map((u) => ({
      uid:         u.id,
      displayName: u.displayName ?? "—",
      email:       u.email ?? "—",
      plan:        u.subscription?.plan ?? "free",
      hasWing:     !!u.wingId,
      createdAt:   u.createdAt?._seconds ? new Date((u.createdAt._seconds) * 1000).toISOString() : null,
    }));

    // ── Wings ────────────────────────────────────────────────────────────────
    const wingsSnap = await db.collection("wings").orderBy("createdAt", "desc").get();
    type RawWing = {
      id: string;
      name?: string;
      ownerId?: string;
      memberIds?: string[];
      createdAt?: { _seconds: number } | null;
    };
    const wings: RawWing[] = wingsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RawWing));

    const totalWings   = wings.length;
    const newWingsWeek = wings.filter((w) => (w.createdAt?._seconds ?? 0) >= weekAgo.getTime() / 1000).length;

    // Wing owner name lookup
    const ownerIds = wings.slice(0, 5).map((w) => w.ownerId).filter(Boolean) as string[];
    const ownerDocs = await Promise.all(ownerIds.map((uid) => db.doc(`users/${uid}`).get()));
    const ownerNames: Record<string, string> = {};
    ownerDocs.forEach((d) => { if (d.exists) ownerNames[d.id] = (d.data() as { displayName?: string }).displayName ?? d.id.slice(0, 8); });

    const recentWings = wings.slice(0, 5).map((w) => ({
      id:          w.id,
      name:        w.name ?? "—",
      memberCount: w.memberIds?.length ?? 0,
      ownerName:   ownerNames[w.ownerId ?? ""] ?? "—",
      createdAt:   w.createdAt?._seconds ? new Date((w.createdAt._seconds) * 1000).toISOString() : null,
    }));

    // Wing size distribution
    const sizeDistribution = { solo: 0, small: 0, medium: 0, large: 0 };
    wings.forEach((w) => {
      const n = w.memberIds?.length ?? 0;
      if (n <= 1)      sizeDistribution.solo++;
      else if (n <= 3) sizeDistribution.small++;
      else if (n <= 6) sizeDistribution.medium++;
      else             sizeDistribution.large++;
    });

    // ── Activity (collection group) ──────────────────────────────────────────
    const [checkinsTodaySnap, mealsTodaySnap, checkinsWeekSnap, mealsWeekSnap] = await Promise.all([
      db.collectionGroup("checkins").where("date", "==", todayStr).count().get(),
      db.collectionGroup("meals").where("mealDate", "==", todayStr).count().get(),
      db.collectionGroup("checkins").where("date", ">=", weekAgoStr).count().get(),
      db.collectionGroup("meals").where("mealDate", ">=", weekAgoStr).count().get(),
    ]);

    return NextResponse.json({
      users: {
        total:          totalUsers,
        newThisWeek:    newUsersWeek,
        newThisMonth:   newUsersMonth,
        premium:        premiumUsers,
        free:           freeUsers,
        recent:         recentUsers,
      },
      wings: {
        total:          totalWings,
        newThisWeek:    newWingsWeek,
        sizeDistribution,
        recent:         recentWings,
      },
      activity: {
        checkinsToday: checkinsTodaySnap.data().count,
        mealsToday:    mealsTodaySnap.data().count,
        checkinsWeek:  checkinsWeekSnap.data().count,
        mealsWeek:     mealsWeekSnap.data().count,
      },
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Admin stats error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
