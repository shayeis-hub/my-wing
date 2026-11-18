import { admin, getAdminApp } from "@/lib/firebase/admin";

const DAILY_NOTIFY_LIMIT = 300;

/** The sender's display name from their own profile — never trusted from the request body. */
export async function senderProfile(uid: string): Promise<{ name: string; gender: "male" | "female" }> {
  getAdminApp();
  const d = (await admin.firestore().doc(`users/${uid}`).get()).data() ?? {};
  return { name: String(d.displayName ?? "").slice(0, 80) || "Wingpact", gender: d.profile?.gender === "female" ? "female" : "male" };
}

export async function isWingMember(wingId: string, uid: string): Promise<{ ok: boolean; memberIds: string[] }> {
  getAdminApp();
  const snap = await admin.firestore().doc(`wings/${wingId}`).get();
  const memberIds: string[] = snap.exists ? (snap.data()?.memberIds ?? []) : [];
  return { ok: memberIds.includes(uid), memberIds };
}

/** True when both users are members of at least one common wing. */
export async function shareAWing(a: string, b: string): Promise<boolean> {
  getAdminApp();
  const snap = await admin.firestore().collection("wings").where("memberIds", "array-contains", a).get();
  return snap.docs.some((d) => ((d.data().memberIds as string[]) ?? []).includes(b));
}

/** Per-sender daily cap so a signed-in user can't spam pushes. Returns false once over the cap. */
export async function withinNotifyQuota(uid: string): Promise<boolean> {
  getAdminApp();
  const db = admin.firestore();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const ref = db.doc(`users/${uid}/dailyUsage/${date}`);
  return db.runTransaction(async (tx) => {
    const n = ((await tx.get(ref)).data()?.notifications as number | undefined) ?? 0;
    if (n >= DAILY_NOTIFY_LIMIT) return false;
    tx.set(ref, { notifications: admin.firestore.FieldValue.increment(1), date }, { merge: true });
    return true;
  });
}

/** Only same-app relative paths; anything else (absolute URLs, //host) falls back. */
export function safeLink(link: unknown, fallback: string): string {
  return typeof link === "string" && /^\/(?!\/)[\w\-./?=&%]*$/.test(link) && link.length <= 200 ? link : fallback;
}

export const clip = (v: unknown, max: number): string => (typeof v === "string" ? v : "").trim().slice(0, max);
