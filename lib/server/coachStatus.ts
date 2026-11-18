import { admin, getAdminApp } from "@/lib/firebase/admin";
import { computeStatus, shiftDate, LOOKBACK_DAYS, type ClientStatus } from "@/lib/coach/status";

const israelDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);

type Wing = { id: string; name: string; isPrivate: boolean };

/**
 * One status row per client of a dietitian: last activity, streak, today's
 * calories vs target, weight trend, menu fit and what needs attention (most
 * urgent first). Read server-side (Admin SDK) across all of the coach's wings.
 * Shared by the dashboard API and the daily push digest.
 */
export async function getCoachClientStatuses(coachId: string): Promise<{ today: string; clients: ClientStatus[] }> {
  getAdminApp();
  const db = admin.firestore();

  const today = israelDate(new Date());
  const dates = Array.from({ length: LOOKBACK_DAYS }, (_, i) => shiftDate(today, -i));

  // clients → the coach's wings they belong to (a client can be in several).
  const wingsSnap = await db.collection("wings").where("ownerId", "==", coachId).get();
  const wingMeta = new Map<string, Wing>();
  const clientWings = new Map<string, { member: { displayName?: string; photoURL?: string }; wingIds: string[] }>();
  for (const w of wingsSnap.docs) {
    const data = w.data();
    wingMeta.set(w.id, { id: w.id, name: data.name ?? "", isPrivate: data.isPrivateCoachWing === true });
    const members: { uid: string; displayName?: string; photoURL?: string }[] = Array.isArray(data.members) ? data.members : [];
    for (const m of members) {
      if (m.uid === coachId) continue;
      const entry = clientWings.get(m.uid) ?? { member: m, wingIds: [] };
      entry.wingIds.push(w.id);
      clientWings.set(m.uid, entry);
    }
  }

  const clientIds = [...clientWings.keys()];
  if (clientIds.length === 0) {
    return { today, clients: [] as ClientStatus[] };
  }

  const userSnaps = clientIds.length ? await db.getAll(...clientIds.map((id) => db.doc(`users/${id}`))) : [];
  const userDocs = new Map(userSnaps.map((s) => [s.id, s.data() ?? {}]));

  // When the dietitian last opened each client's chat (set by markChatRead).
  const readSnap = await db.collection(`users/${coachId}/chatReads`).get();
  const lastReadMs = new Map(readSnap.docs.map((d) => [d.id, (d.data().lastReadAt?.toMillis?.() as number | undefined) ?? 0]));
  const postsCutoff = Date.now() - 14 * 86_400_000;

  async function buildClient(clientId: string): Promise<ClientStatus> {
    const { member, wingIds } = clientWings.get(clientId)!;
    const user = userDocs.get(clientId) ?? {};

    const checkins: { date: string; weightKg?: number }[] = [];
    const meals: { date: string; calories: number; menuStatus?: string; menuScore?: number }[] = [];

    for (const wingId of wingIds) {
      const refs = dates.map((d) => db.doc(`wings/${wingId}/checkins/${clientId}_${d}`));
      const [checkinSnaps, mealsSnap] = await Promise.all([
        db.getAll(...refs),
        db.collection(`wings/${wingId}/meals`).where("userId", "==", clientId).orderBy("createdAt", "desc").limit(60).get(),
      ]);
      checkinSnaps.forEach((s, i) => {
        if (!s.exists) return;
        const w = s.data()?.weightKg;
        checkins.push({ date: dates[i], weightKg: typeof w === "number" ? w : undefined });
      });
      mealsSnap.docs.forEach((d) => {
        const m = d.data();
        const created: Date | undefined = m.createdAt?.toDate?.();
        const date: string | undefined = m.mealDate ?? (created ? israelDate(created) : undefined);
        if (!date || date < dates[dates.length - 1]) return;
        meals.push({ date, calories: Number(m.analysis?.calories) || 0, menuStatus: m.analysis?.menuMatch?.status, menuScore: typeof m.analysis?.menuMatch?.score === "number" ? m.analysis.menuMatch.score : undefined });
      });
    }

    // Feed posts by this client the dietitian hasn't seen yet (since she last opened the chat).
    let unreadPosts = 0;
    const seenAt = Math.max(lastReadMs.get(clientId) ?? 0, postsCutoff);
    for (const wingId of wingIds) {
      const postsSnap = await db.collection(`wings/${wingId}/posts`).orderBy("createdAt", "desc").limit(30).get().catch(() => null);
      postsSnap?.docs.forEach((d) => {
        const p = d.data();
        if (p.userId === clientId && (p.createdAt?.toMillis?.() ?? 0) > seenAt) unreadPosts++;
      });
    }

    const createdAt: Date | undefined = user.createdAt?.toDate?.();
    const status = computeStatus({
      today,
      checkins,
      meals,
      calorieTarget: user.profile?.dailyCalorieTarget ?? null,
      targetWeightKg: user.profile?.targetWeightKg ?? null,
      createdDate: createdAt ? israelDate(createdAt) : null,
    });

    const primary = wingMeta.get(wingIds[0])!;
    return {
      uid: clientId,
      displayName: user.displayName ?? member.displayName ?? "",
      photoURL: user.photoURL ?? member.photoURL,
      wingId: primary.id,
      wingName: primary.name,
      isPrivate: primary.isPrivate,
      unreadPosts,
      ...status,
    };
  }

  // Bounded concurrency — a large practice can have 100+ clients.
  const clients: ClientStatus[] = [];
  for (let i = 0; i < clientIds.length; i += 12) {
    clients.push(...(await Promise.all(clientIds.slice(i, i + 12).map(buildClient))));
  }
  clients.sort((a, b) => b.attention - a.attention || a.displayName.localeCompare(b.displayName, "he"));

  return { today, clients };
}
