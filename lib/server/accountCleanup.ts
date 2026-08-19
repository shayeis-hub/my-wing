import { admin, getAdminApp } from "@/lib/firebase/admin";

// Firestore batches are capped at 500 writes; stay safely under that.
const BATCH_LIMIT = 450;

async function commitInChunks(
  db: FirebaseFirestore.Firestore,
  ops: Array<(batch: FirebaseFirestore.WriteBatch) => void>
): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + BATCH_LIMIT)) op(batch);
    await batch.commit();
  }
}

const OWN_DOC_COLLECTIONS: Array<{ name: string; idField: "userId" | "authorId" }> = [
  { name: "checkins", idField: "userId" },
  { name: "weightLogs", idField: "userId" },
  { name: "steps", idField: "userId" },
  { name: "meals", idField: "userId" },
  { name: "posts", idField: "userId" },
  { name: "wallMessages", idField: "authorId" },
];

const ARRAY_FIELD_TARGETS: Array<{
  collection: string;
  fields: Array<{ name: string; idKey: "authorId" | "userId" }>;
}> = [
  {
    collection: "checkins",
    fields: [
      { name: "encouragements", idKey: "authorId" },
      { name: "reactions", idKey: "userId" },
    ],
  },
  {
    collection: "meals",
    fields: [
      { name: "comments", idKey: "authorId" },
      { name: "reactions", idKey: "userId" },
    ],
  },
  {
    collection: "posts",
    fields: [
      { name: "comments", idKey: "authorId" },
      { name: "reactions", idKey: "userId" },
    ],
  },
];

/**
 * Delete a user's own checkins/weightLogs/steps/meals/posts/wallMessages in
 * one wing, plus any comments/reactions/encouragements they authored on
 * other members' content there.
 */
async function purgeUserFromWing(
  db: FirebaseFirestore.Firestore,
  wingId: string,
  uid: string
): Promise<void> {
  const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  const wingRef = db.collection("wings").doc(wingId);

  for (const { name, idField } of OWN_DOC_COLLECTIONS) {
    const snap = await wingRef.collection(name).where(idField, "==", uid).get();
    snap.docs.forEach((d) => ops.push((batch) => batch.delete(d.ref)));
  }

  for (const { collection, fields } of ARRAY_FIELD_TARGETS) {
    const snap = await wingRef.collection(collection).get();
    for (const d of snap.docs) {
      const data = d.data();
      const updates: Record<string, unknown> = {};
      for (const { name, idKey } of fields) {
        const arr = data[name] as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const filtered = arr.filter((entry) => entry?.[idKey] !== uid);
        if (filtered.length !== arr.length) updates[name] = filtered;
      }
      if (Object.keys(updates).length > 0) {
        ops.push((batch) => batch.update(d.ref, updates));
      }
    }
  }

  await commitInChunks(db, ops);
}

/**
 * Purge a user's data from every wing they belong to, plus their own
 * dailyUsage records. Does NOT delete the users/{uid} doc or the Auth user —
 * callers are expected to do that themselves right after this resolves.
 */
export async function purgeUserData(uid: string): Promise<void> {
  getAdminApp();
  const db = admin.firestore();

  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.data() ?? {};
  const wingIds = new Set<string>([
    ...(Array.isArray(userData.wingIds) ? (userData.wingIds as string[]) : []),
    ...(typeof userData.wingId === "string" ? [userData.wingId] : []),
  ]);

  for (const wingId of wingIds) {
    await purgeUserFromWing(db, wingId, uid);
  }

  const dailyUsageSnap = await db.collection("users").doc(uid).collection("dailyUsage").get();
  await commitInChunks(
    db,
    dailyUsageSnap.docs.map((d) => (batch: FirebaseFirestore.WriteBatch) => batch.delete(d.ref))
  );
}
