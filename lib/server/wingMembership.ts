import { admin, getAdminApp } from "@/lib/firebase/admin";

export interface WingDocData {
  ownerId?: string;
  createdBy?: string;
  adminIds?: string[];
  memberIds?: string[];
  members?: Array<{ uid: string; displayName?: string; photoURL?: string }>;
  [key: string]: unknown;
}

/** Load a wing document. Returns null if it doesn't exist. */
export async function loadWing(wingId: string) {
  getAdminApp();
  const ref = admin.firestore().collection("wings").doc(wingId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as WingDocData;
  const ownerId = (data.ownerId ?? data.createdBy ?? "") as string;
  return { ref, data, ownerId };
}

export function isAdminOf(data: WingDocData, ownerId: string, uid: string): boolean {
  return uid === ownerId || (Array.isArray(data.adminIds) ? data.adminIds : []).includes(uid);
}

/**
 * Pick the successor owner when `leavingId` (the current owner) is removed.
 * Prefers an existing co-admin (in adminIds order), otherwise the
 * longest-standing remaining member (members[] order = join order).
 */
function pickSuccessor(data: WingDocData, leavingId: string): string | null {
  const memberIds = (Array.isArray(data.memberIds) ? data.memberIds : []).filter(
    (id) => id !== leavingId
  );
  if (memberIds.length === 0) return null;

  const adminIds = (Array.isArray(data.adminIds) ? data.adminIds : []).filter(
    (id) => id !== leavingId && memberIds.includes(id)
  );
  if (adminIds.length > 0) return adminIds[0];

  const members = Array.isArray(data.members) ? data.members : [];
  for (const m of members) {
    if (m?.uid && memberIds.includes(m.uid)) return m.uid;
  }
  return memberIds[0];
}

export interface RemoveResult {
  deleted: boolean;
  newOwnerId?: string;
  ownerChanged: boolean;
}

/**
 * Remove `targetId` from the wing. Handles ownership succession (auto-promotion)
 * and clears the removed user's `wingId`. If the wing becomes empty it is deleted.
 */
export async function removeMemberWithSuccession(
  wingId: string,
  targetId: string
): Promise<RemoveResult> {
  getAdminApp();
  const db = admin.firestore();
  const ref = db.collection("wings").doc(wingId);
  const snap = await ref.get();
  if (!snap.exists) return { deleted: false, ownerChanged: false };

  const data = snap.data() as WingDocData;
  const ownerId = (data.ownerId ?? data.createdBy ?? "") as string;

  const memberIds = (Array.isArray(data.memberIds) ? data.memberIds : []).filter(
    (id) => id !== targetId
  );
  const members = (Array.isArray(data.members) ? data.members : []).filter(
    (m) => m?.uid !== targetId
  );
  let adminIds = (Array.isArray(data.adminIds) ? data.adminIds : []).filter(
    (id) => id !== targetId
  );

  // Wing is now empty → delete it.
  if (memberIds.length === 0) {
    await ref.delete();
    await clearUserWing(db, targetId);
    return { deleted: true, ownerChanged: false };
  }

  let newOwnerId = ownerId;
  let ownerChanged = false;
  if (targetId === ownerId) {
    const successor = pickSuccessor(data, targetId);
    if (successor) {
      newOwnerId = successor;
      ownerChanged = true;
      adminIds = adminIds.filter((id) => id !== successor); // promoted out of co-admins
    }
  }

  await ref.update({
    ownerId: newOwnerId,
    memberIds,
    members,
    adminIds,
  });
  await clearUserWing(db, targetId);

  return { deleted: false, newOwnerId, ownerChanged };
}

async function clearUserWing(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<void> {
  try {
    await db
      .collection("users")
      .doc(uid)
      .update({ wingId: admin.firestore.FieldValue.delete() });
  } catch {
    // User doc may already be deleted (e.g. account deletion) — ignore.
  }
}
