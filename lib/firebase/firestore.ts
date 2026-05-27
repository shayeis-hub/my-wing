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
