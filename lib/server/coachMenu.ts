import { admin, getAdminApp } from "@/lib/firebase/admin";
import { isCoachActive } from "@/lib/subscription";

export class MenuAuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function storageBucket() {
  getAdminApp();
  return admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
}

/** True if clientId is a member (other than the coach) of any wing the coach owns. */
export async function coachHasClient(coachId: string, clientId: string): Promise<boolean> {
  if (!clientId || clientId === coachId) return false;
  getAdminApp();
  const snap = await admin
    .firestore()
    .collection("wings")
    .where("ownerId", "==", coachId)
    .where("memberIds", "array-contains", clientId)
    .limit(1)
    .get();
  return !snap.empty;
}

/** Throws MenuAuthError unless the caller is an active dietitian who owns this client. */
export async function assertCoachOwnsClient(coachId: string, clientId: string): Promise<{ coachName: string }> {
  getAdminApp();
  const coachData = (await admin.firestore().doc(`users/${coachId}`).get()).data() ?? {};
  if (!(coachData.accountType === "business" && isCoachActive(coachData.coach))) {
    throw new MenuAuthError(403, "Coach plan inactive");
  }
  if (!(await coachHasClient(coachId, clientId))) throw new MenuAuthError(403, "Not your client");
  return { coachName: coachData.displayName ?? "" };
}

/** Deletes a client's menu docs (draft + published) and the uploaded files. */
export async function deleteClientMenu(coachId: string, clientId: string): Promise<void> {
  getAdminApp();
  const db = admin.firestore();
  await Promise.all([db.doc(`clientMenus/${clientId}`).delete(), db.doc(`clientMenuDrafts/${clientId}`).delete()]);
  await storageBucket()
    .deleteFiles({ prefix: `menus/${coachId}/${clientId}/` })
    .catch(() => { /* files may not exist */ });
}
