import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  updateDoc,
  deleteDoc,
  increment,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type {
  Wing,
  Meal,
  DailyCheckin,
  Encouragement,
  Reaction,
  ReactionType,
  DailyPrompt,
  PromptResponse,
  WingPost,
  StepsEntry,
  Challenge,
  Trophy,
  WingMember,
  WeightLog,
  Subscription,
} from "@/types";
import { nanoid } from "@/lib/utils/nanoid";

// ── Wings ────────────────────────────────────────────────────────────────────

// Normalizes old wing documents (createdBy→ownerId, missing members array)
function normalizeWing(data: Record<string, unknown>, id: string): Wing {
  const memberIds = Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [];
  const members = Array.isArray(data.members)
    ? (data.members as WingMember[])
    : memberIds.map((uid) => ({ uid, displayName: uid.slice(0, 8) }));
  return {
    ...(data as Omit<Wing, "id" | "ownerId" | "members" | "memberIds">),
    id,
    ownerId: (data.ownerId ?? data.createdBy ?? "") as string,
    members,
    memberIds,
    name: (data.name ?? "") as string,
    inviteToken: (data.inviteToken ?? "") as string,
  } as Wing;
}

export async function createWing(
  ownerId: string,
  ownerName: string,
  name: string
): Promise<Wing> {
  const inviteToken = nanoid(10);
  const wingRef = doc(collection(db, "wings"));
  const wing: Omit<Wing, "id"> = {
    name,
    ownerId,
    memberIds: [ownerId],
    members: [{ uid: ownerId, displayName: ownerName }],
    inviteToken,
    createdAt: serverTimestamp() as Wing["createdAt"],
  };
  await setDoc(wingRef, wing);
  await updateDoc(doc(db, "users", ownerId), { wingId: wingRef.id });
  return { ...wing, id: wingRef.id };
}

export async function joinWing(
  token: string,
  userId: string,
  displayName: string,
  photoURL?: string
): Promise<Wing | null> {
  const q = query(collection(db, "wings"), where("inviteToken", "==", token));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const wingDoc = snap.docs[0];
  const member: WingMember = { uid: userId, displayName, ...(photoURL ? { photoURL } : {}) };
  await updateDoc(wingDoc.ref, {
    memberIds: arrayUnion(userId),
    members: arrayUnion(member),
  });
  await updateDoc(doc(db, "users", userId), { wingId: wingDoc.id });
  return normalizeWing(wingDoc.data() as Record<string, unknown>, wingDoc.id);
}

export async function updateUserStepsGoal(uid: string, stepsGoal: number): Promise<void> {
  await updateDoc(doc(db, "users", uid), { "profile.stepsGoal": stepsGoal });
}

export async function saveUserTimezone(uid: string, timezone: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { timezone });
}

export async function renameWing(wingId: string, name: string): Promise<void> {
  await updateDoc(doc(db, "wings", wingId), { name });
}

export async function regenerateInviteToken(wingId: string): Promise<string> {
  const token = nanoid(10);
  await updateDoc(doc(db, "wings", wingId), { inviteToken: token });
  return token;
}

export async function syncWingMemberUid(
  wingId: string,
  uid: string,
  displayName: string
): Promise<void> {
  const wingSnap = await getDoc(doc(db, "wings", wingId));
  if (!wingSnap.exists()) return;
  const data = wingSnap.data();
  const members = (data.members ?? []) as WingMember[];
  if (members.some((m) => m.uid === uid)) return; // already correct

  const idx = members.findIndex((m) => m.displayName === displayName);
  if (idx === -1) return;

  const oldUid = members[idx].uid;
  const updated = members.map((m, i) => (i === idx ? { ...m, uid } : m));
  const memberIds = ((data.memberIds ?? []) as string[]).map((id) =>
    id === oldUid ? uid : id
  );
  await updateDoc(doc(db, "wings", wingId), { members: updated, memberIds });
}

export async function getWing(wingId: string): Promise<Wing | null> {
  const snap = await getDoc(doc(db, "wings", wingId));
  return snap.exists() ? { ...(snap.data() as Omit<Wing, "id">), id: snap.id } : null;
}

export function subscribeToWing(
  wingId: string,
  cb: (wing: Wing) => void
): Unsubscribe {
  return onSnapshot(doc(db, "wings", wingId), (snap) => {
    if (snap.exists()) cb(normalizeWing(snap.data() as Record<string, unknown>, snap.id));
  });
}

// ── Meals ─────────────────────────────────────────────────────────────────────

export async function addMeal(
  wingId: string,
  meal: Omit<Meal, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "wings", wingId, "meals"), {
    ...meal,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function addMealComment(
  wingId: string,
  mealId: string,
  comment: Encouragement
): Promise<void> {
  await updateDoc(doc(db, "wings", wingId, "meals", mealId), {
    comments: arrayUnion(comment),
  });
}

export async function updateMeal(
  wingId: string,
  mealId: string,
  updates: Partial<Pick<Meal, "analysis" | "mealType" | "mealTime" | "notes">>
): Promise<void> {
  await updateDoc(doc(db, "wings", wingId, "meals", mealId), updates);
}

export async function deleteMeal(wingId: string, mealId: string): Promise<void> {
  await deleteDoc(doc(db, "wings", wingId, "meals", mealId));
}

export async function getWingMeals(wingId: string, limitN = 20): Promise<Meal[]> {
  const q = query(
    collection(db, "wings", wingId, "meals"),
    orderBy("createdAt", "desc"),
    limit(limitN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Meal, "id">), id: d.id }));
}

export function subscribeToMeals(
  wingId: string,
  cb: (meals: Meal[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "wings", wingId, "meals"),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Meal, "id">), id: d.id })));
  });
}

// ── Check-ins ─────────────────────────────────────────────────────────────────

export async function saveCheckin(
  wingId: string,
  checkin: Omit<DailyCheckin, "id" | "createdAt">
): Promise<void> {
  const id = `${checkin.userId}_${checkin.date}`;
  await setDoc(doc(db, "wings", wingId, "checkins", id), {
    ...checkin,
    createdAt: serverTimestamp(),
  });
  // Sync steps to the steps collection so leaderboard stays consistent (best-effort)
  if (checkin.steps) {
    try {
      await setDoc(doc(db, "wings", wingId, "steps", id), {
        wingId,
        userId: checkin.userId,
        userName: checkin.userName,
        date: checkin.date,
        steps: checkin.steps,
        createdAt: serverTimestamp(),
      });
    } catch {
      // non-critical — checkin was saved, leaderboard sync failed silently
    }
  }
}

export async function getTodayCheckin(
  wingId: string,
  userId: string,
  date: string
): Promise<DailyCheckin | null> {
  const id = `${userId}_${date}`;
  const snap = await getDoc(doc(db, "wings", wingId, "checkins", id));
  return snap.exists()
    ? { ...(snap.data() as Omit<DailyCheckin, "id">), id: snap.id }
    : null;
}

export async function getWingCheckins(
  wingId: string,
  date: string
): Promise<DailyCheckin[]> {
  const q = query(
    collection(db, "wings", wingId, "checkins"),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<DailyCheckin, "id">),
    id: d.id,
  }));
}

export async function getMonthCheckins(
  wingId: string,
  yearMonth: string
): Promise<DailyCheckin[]> {
  const q = query(
    collection(db, "wings", wingId, "checkins"),
    where("date", ">=", `${yearMonth}-01`),
    where("date", "<=", `${yearMonth}-31`)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<DailyCheckin, "id">),
    id: d.id,
  }));
}

export async function addEncouragement(
  wingId: string,
  checkinId: string,
  encouragement: Encouragement
): Promise<void> {
  await updateDoc(doc(db, "wings", wingId, "checkins", checkinId), {
    encouragements: arrayUnion(encouragement),
  });
}

// ── Reactions ─────────────────────────────────────────────────────────────────
// One reaction per user per item. If user clicks same type → remove. Different type → replace.
async function toggleReactionGeneric(
  docPath: string[],
  current: Reaction[] | undefined,
  userId: string,
  userName: string,
  type: ReactionType,
): Promise<Reaction[]> {
  const existing = (current ?? []).find((r) => r.userId === userId);
  const withoutMine = (current ?? []).filter((r) => r.userId !== userId);
  const next: Reaction[] = existing && existing.type === type
    ? withoutMine // toggle off
    : [...withoutMine, { userId, userName, type, createdAt: Date.now() }];
  await updateDoc(doc(db, ...(docPath as [string, ...string[]])), { reactions: next });
  return next;
}

export async function toggleMealReaction(
  wingId: string,
  mealId: string,
  current: Reaction[] | undefined,
  userId: string,
  userName: string,
  type: ReactionType,
): Promise<Reaction[]> {
  return toggleReactionGeneric(["wings", wingId, "meals", mealId], current, userId, userName, type);
}

export async function toggleCheckinReaction(
  wingId: string,
  checkinId: string,
  current: Reaction[] | undefined,
  userId: string,
  userName: string,
  type: ReactionType,
): Promise<Reaction[]> {
  return toggleReactionGeneric(["wings", wingId, "checkins", checkinId], current, userId, userName, type);
}

export async function togglePromptReaction(
  wingId: string,
  promptId: string,
  current: Reaction[] | undefined,
  userId: string,
  userName: string,
  type: ReactionType,
): Promise<Reaction[]> {
  return toggleReactionGeneric(["wings", wingId, "prompts", promptId], current, userId, userName, type);
}

// ── Daily Prompts ─────────────────────────────────────────────────────────────
export async function getTodayPrompt(wingId: string, date: string): Promise<DailyPrompt | null> {
  const snap = await getDoc(doc(db, "wings", wingId, "prompts", date));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<DailyPrompt, "id">) };
}

export async function createDailyPrompt(
  wingId: string,
  date: string,
  question: string,
  questionId: number,
): Promise<DailyPrompt> {
  const data = {
    wingId,
    date,
    question,
    questionId,
    responses: [] as PromptResponse[],
    reactions: [] as Reaction[],
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, "wings", wingId, "prompts", date), data, { merge: false });
  return { id: date, ...data } as unknown as DailyPrompt;
}

export async function addPromptResponse(
  wingId: string,
  promptDate: string,
  response: PromptResponse,
): Promise<void> {
  await updateDoc(doc(db, "wings", wingId, "prompts", promptDate), {
    responses: arrayUnion(response),
  });
}

export async function getRecentPrompts(wingId: string, days: number = 14): Promise<DailyPrompt[]> {
  const snap = await getDocs(
    query(collection(db, "wings", wingId, "prompts"), orderBy("date", "desc"), limit(days)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DailyPrompt, "id">) }));
}

// ── Wing Posts (social feed) ──────────────────────────────────────────────────
export async function createWingPost(
  wingId: string,
  post: Omit<WingPost, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "wings", wingId, "posts"), {
    ...post,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getWingPosts(wingId: string, max: number = 50): Promise<WingPost[]> {
  const snap = await getDocs(
    query(collection(db, "wings", wingId, "posts"), orderBy("createdAt", "desc"), limit(max)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WingPost, "id">) }));
}

export async function deleteWingPost(wingId: string, postId: string): Promise<void> {
  await deleteDoc(doc(db, "wings", wingId, "posts", postId));
}

export async function addPostComment(
  wingId: string,
  postId: string,
  comment: Encouragement,
): Promise<void> {
  await updateDoc(doc(db, "wings", wingId, "posts", postId), {
    comments: arrayUnion(comment),
  });
}

export async function togglePostReaction(
  wingId: string,
  postId: string,
  current: Reaction[] | undefined,
  userId: string,
  userName: string,
  type: ReactionType,
): Promise<Reaction[]> {
  return toggleReactionGeneric(["wings", wingId, "posts", postId], current, userId, userName, type);
}

// ── Steps ─────────────────────────────────────────────────────────────────────

export async function saveSteps(
  wingId: string,
  entry: Omit<StepsEntry, "id" | "createdAt">
): Promise<void> {
  const id = `${entry.userId}_${entry.date}`;
  await setDoc(doc(db, "wings", wingId, "steps", id), {
    ...entry,
    createdAt: serverTimestamp(),
  });
  // Sync steps to the checkin doc so calendar and daily summary stay consistent
  await setDoc(
    doc(db, "wings", wingId, "checkins", id),
    { steps: entry.steps },
    { merge: true }
  );
}

export async function getUserTodayMeals(
  wingId: string,
  userId: string,
  date: string
): Promise<Meal[]> {
  const q = query(
    collection(db, "wings", wingId, "meals"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<Meal, "id">), id: d.id }))
    .filter((m) => {
      // mealDate is set for retroactive meals — use it first to avoid affecting today's window
      if (m.mealDate) return m.mealDate === date;
      const ts = m.createdAt as unknown as { toDate?: () => Date; _seconds?: number };
      if (!ts) return false;
      const d = ts.toDate ? ts.toDate() : new Date((ts._seconds ?? 0) * 1000);
      return d.toISOString().slice(0, 10) === date;
    })
    .sort((a, b) => {
      const toMs = (m: Meal) => {
        const ts = m.createdAt as unknown as { toDate?: () => Date; _seconds?: number };
        return ts?.toDate ? ts.toDate().getTime() : (ts?._seconds ?? 0) * 1000;
      };
      return toMs(a) - toMs(b);
    });
}

export async function getWingSteps(
  wingId: string,
  date: string
): Promise<StepsEntry[]> {
  const q = query(
    collection(db, "wings", wingId, "steps"),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<StepsEntry, "id">),
    id: d.id,
  }));
}

// ── Weight logs ───────────────────────────────────────────────────────────────

export async function saveWeightLog(
  wingId: string,
  entry: { userId: string; userName: string; date: string; weightKg: number }
): Promise<void> {
  const id = `${entry.userId}_${entry.date}`;
  await setDoc(doc(db, "wings", wingId, "weightLogs", id), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

export async function getWeightHistory(
  wingId: string,
  userId: string
): Promise<WeightLog[]> {
  const q = query(
    collection(db, "wings", wingId, "weightLogs"),
    where("userId", "==", userId),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<WeightLog, "id">),
    id: d.id,
  }));
}

export async function getUserCheckinDates(
  wingId: string,
  userId: string,
  days = 60
): Promise<string[]> {
  const q = query(
    collection(db, "wings", wingId, "checkins"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(days)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data() as { date: string }).date);
}

// ── Challenges ────────────────────────────────────────────────────────────────

export async function saveChallenge(
  wingId: string,
  challenge: Omit<Challenge, "id" | "createdAt">
): Promise<void> {
  const ref = doc(collection(db, "wings", wingId, "challenges"));
  await setDoc(ref, { ...challenge, createdAt: serverTimestamp() });
  await updateDoc(doc(db, "wings", wingId), { activeChallenge: { ...challenge, id: ref.id } });
}

export async function getWingChallenges(wingId: string): Promise<Challenge[]> {
  const snap = await getDocs(collection(db, "wings", wingId, "challenges"));
  const challenges = snap.docs.map((d) => ({ ...(d.data() as Omit<Challenge, "id">), id: d.id }));
  // Sort newest first in JS (avoids composite index requirement)
  return challenges.sort((a, b) => {
    const aTime = a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.seconds ?? 0;
    return bTime - aTime;
  });
}

export async function getChallenge(wingId: string, challengeId: string): Promise<Challenge | null> {
  const snap = await getDoc(doc(db, "wings", wingId, "challenges", challengeId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<Challenge, "id">), id: snap.id };
}

export async function getWingCheckinsRange(
  wingId: string,
  startDate: string,
  endDate: string
): Promise<DailyCheckin[]> {
  const q = query(
    collection(db, "wings", wingId, "checkins"),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Omit<DailyCheckin, "id">), id: d.id }));
}

export async function getWingStepsRange(
  wingId: string,
  startDate: string,
  endDate: string
): Promise<StepsEntry[]> {
  const q = query(
    collection(db, "wings", wingId, "steps"),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Omit<StepsEntry, "id">), id: d.id }));
}

export async function updateChallengeProgress(
  wingId: string,
  challengeId: string,
  userId: string,
  value: number
): Promise<void> {
  await updateDoc(doc(db, "wings", wingId, "challenges", challengeId), {
    [`progress.${userId}`]: value,
  });
}

export async function finishChallenge(
  wingId: string,
  challenge: Challenge,
  members: WingMember[]
): Promise<void> {
  // Sort members by progress descending
  const sorted = [...members].sort(
    (a, b) => (challenge.progress[b.uid] ?? 0) - (challenge.progress[a.uid] ?? 0)
  );
  const medals: Array<"gold" | "silver" | "bronze"> = ["gold", "silver", "bronze"];
  const winners = sorted.slice(0, 3).map((m) => m.uid);

  // Mark challenge as finished
  await updateDoc(doc(db, "wings", wingId, "challenges", challenge.id), {
    status: "finished",
    winners,
  });

  // Clear active challenge on wing
  await updateDoc(doc(db, "wings", wingId), { activeChallenge: null });

  // Award trophies to top 3
  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const member = sorted[i];
    if (!challenge.progress[member.uid]) continue; // skip if no progress at all
    const trophy: Trophy = {
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      challengeType: challenge.type,
      medal: medals[i],
      endDate: challenge.endDate,
      wingId,
    };
    await updateDoc(doc(db, "users", member.uid), {
      trophies: arrayUnion(trophy),
    });
  }
}

// ── Subscription & daily usage ────────────────────────────────────────────────

export async function getUserPlan(uid: string): Promise<Subscription | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as { subscription?: Subscription };
  return data.subscription ?? null;
}

export async function saveUserSubscription(
  uid: string,
  subscription: Subscription
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { subscription });
}

export async function getDailyMealCount(uid: string, date: string): Promise<number> {
  const snap = await getDoc(doc(db, "users", uid, "dailyUsage", date));
  if (!snap.exists()) return 0;
  const data = snap.data() as { mealPhotos?: number };
  return data.mealPhotos ?? 0;
}

export async function incrementDailyMealCount(uid: string, date: string): Promise<void> {
  const ref = doc(db, "users", uid, "dailyUsage", date);
  await setDoc(ref, { mealPhotos: increment(1), date }, { merge: true });
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Recent encouragements / comments received                                 */
/*  Aggregates across checkins + meals + posts so the dashboard can surface  */
/*  what teammates wrote to the user, in one place.                          */
/* ────────────────────────────────────────────────────────────────────────── */

export interface RecentEncouragement {
  type: "checkin" | "meal" | "post";
  authorName: string;
  authorId: string;
  text: string;
  createdAt: number;      // ms since epoch
  link: string;           // route to navigate to
  contextLabel?: string;
  reactions?: Reaction[];
  // For toggling reactions on this specific encouragement
  parentDocId: string;    // mealId / "userId_date" / postId
  encKey: string;         // `${authorId}_${createdAt}` — unique per encouragement
}

export async function getRecentEncouragementsForUser(
  wingId: string,
  userId: string,
  days: number = 7
): Promise<RecentEncouragement[]> {
  const since = Date.now() - days * 86400 * 1000;

  // Build dateStr list for last N days
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().split("T")[0]);
  }

  // Fire all reads in parallel
  const [checkinDocs, mealsSnap, postsSnap] = await Promise.all([
    Promise.all(
      dates.map((d) => getDoc(doc(db, "wings", wingId, "checkins", `${userId}_${d}`)))
    ),
    getDocs(query(collection(db, "wings", wingId, "meals"), where("userId", "==", userId))),
    getDocs(query(collection(db, "wings", wingId, "posts"), where("userId", "==", userId))),
  ]);

  const items: RecentEncouragement[] = [];

  // Checkins
  for (const snap of checkinDocs) {
    if (!snap.exists()) continue;
    const data = snap.data() as DailyCheckin;
    for (const enc of data.encouragements ?? []) {
      if (enc.authorId === userId) continue;          // skip own replies
      if ((enc.createdAt as number) < since) continue;
      items.push({
        type: "checkin",
        authorName: enc.authorName,
        authorId: enc.authorId,
        text: enc.text,
        createdAt: enc.createdAt as number,
        link: `/checkin?date=${data.date}`,
        contextLabel: data.date,
        reactions: enc.reactions ?? [],
        parentDocId: snap.id,
        encKey: `${enc.authorId}_${enc.createdAt}`,
      });
    }
  }

  // Meals
  for (const m of mealsSnap.docs) {
    const md = m.data() as Meal;
    for (const c of md.comments ?? []) {
      if (c.authorId === userId) continue;
      if ((c.createdAt as number) < since) continue;
      items.push({
        type: "meal",
        authorName: c.authorName,
        authorId: c.authorId,
        text: c.text,
        createdAt: c.createdAt as number,
        link: `/meals?meal=${m.id}`,
        contextLabel: md.analysis?.description?.slice(0, 30),
        reactions: c.reactions ?? [],
        parentDocId: m.id,
        encKey: `${c.authorId}_${c.createdAt}`,
      });
    }
  }

  // Posts
  for (const p of postsSnap.docs) {
    const pd = p.data() as WingPost;
    for (const c of pd.comments ?? []) {
      if (c.authorId === userId) continue;
      if ((c.createdAt as number) < since) continue;
      items.push({
        type: "post",
        authorName: c.authorName,
        authorId: c.authorId,
        text: c.text,
        createdAt: c.createdAt as number,
        link: "/feed",
        reactions: c.reactions ?? [],
        parentDocId: p.id,
        encKey: `${c.authorId}_${c.createdAt}`,
      });
    }
  }

  items.sort((a, b) => b.createdAt - a.createdAt);
  return items;
}

// Toggle reaction on a specific encouragement/comment inside a parent doc
export async function toggleEncouragementReaction(
  wingId: string,
  parentType: "checkin" | "meal" | "post",
  parentDocId: string,
  encKey: string,          // `${authorId}_${createdAt}`
  reaction: Reaction,
  fieldName: "encouragements" | "comments",
): Promise<Reaction[]> {
  const collectionName =
    parentType === "checkin" ? "checkins" :
    parentType === "meal"    ? "meals" : "posts";

  const ref = doc(db, "wings", wingId, collectionName, parentDocId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];

  const data = snap.data() as Record<string, unknown>;
  const arr: Encouragement[] = (data[fieldName] as Encouragement[] | undefined) ?? [];

  const updated = arr.map((enc) => {
    const key = `${enc.authorId}_${enc.createdAt}`;
    if (key !== encKey) return enc;
    const existing = enc.reactions ?? [];
    const mine = existing.find((r) => r.userId === reaction.userId && r.type === reaction.type);
    return {
      ...enc,
      reactions: mine
        ? existing.filter((r) => !(r.userId === reaction.userId && r.type === reaction.type))
        : [...existing, reaction],
    };
  });

  await updateDoc(ref, { [fieldName]: updated });

  const updatedEnc = updated.find((enc) => `${enc.authorId}_${enc.createdAt}` === encKey);
  return updatedEnc?.reactions ?? [];
}

// ── Group Energy ──────────────────────────────────────────────────────────────

export interface GroupEnergy {
  checkinsToday: number;    // members who checked in today
  mealsTodayCount: number;  // meals logged today across wing
  streakDays: number;       // consecutive days with at least 1 checkin
  newActivity: number;      // encouragements + reactions in last 24h
}

export async function getGroupEnergy(wingId: string, memberCount: number): Promise<GroupEnergy> {
  const todayStr = new Date().toISOString().split("T")[0];
  const since24h = Date.now() - 86_400_000;

  const [checkinsSnap, mealsSnap] = await Promise.all([
    getDocs(query(collection(db, "wings", wingId, "checkins"), where("date", "==", todayStr))),
    getDocs(query(collection(db, "wings", wingId, "meals"), where("mealDate", "==", todayStr))),
  ]);

  const checkinsToday = checkinsSnap.size;
  const mealsTodayCount = mealsSnap.size;

  // Streak: count consecutive days backwards with at least 1 checkin
  let streakDays = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const dateStr = new Date(d.getTime() - i * 86_400_000).toISOString().split("T")[0];
    const snap = await getDocs(query(
      collection(db, "wings", wingId, "checkins"),
      where("date", "==", dateStr),
    ));
    if (snap.empty) break;
    streakDays++;
  }

  // New activity: count encouragements across checkins in last 24h
  let newActivity = 0;
  checkinsSnap.forEach((doc) => {
    const data = doc.data() as DailyCheckin;
    for (const enc of data.encouragements ?? []) {
      if ((enc.createdAt as number) >= since24h) newActivity++;
    }
  });

  return { checkinsToday, mealsTodayCount, streakDays, newActivity };
}
