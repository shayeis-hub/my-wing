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
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type {
  Wing,
  Meal,
  DailyCheckin,
  Encouragement,
  StepsEntry,
  Challenge,
  WingMember,
  WeightLog,
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

export async function renameWing(wingId: string, name: string): Promise<void> {
  await updateDoc(doc(db, "wings", wingId), { name });
}

export async function regenerateInviteToken(wingId: string): Promise<string> {
  const token = nanoid(10);
  await updateDoc(doc(db, "wings", wingId), { inviteToken: token });
  return token;
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
    limit(30)
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

// ── Challenges ────────────────────────────────────────────────────────────────

export async function saveChallenge(
  wingId: string,
  challenge: Omit<Challenge, "id" | "createdAt">
): Promise<void> {
  const ref = doc(collection(db, "wings", wingId, "challenges"));
  await setDoc(ref, { ...challenge, createdAt: serverTimestamp() });
  await updateDoc(doc(db, "wings", wingId), { activeChallenge: { ...challenge, id: ref.id } });
}
