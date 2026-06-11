import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-course-secret");
  if (secret !== process.env.COURSE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const app = getAdminApp();
  const db = admin.firestore(app);
  const auth = admin.auth(app);

  // Find user by email
  let uid: string;
  try {
    const authUser = await auth.getUserByEmail(email);
    uid = authUser.uid;
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Find all wings where this user is a member
  const wingsSnap = await db.collection("wings").where("memberIds", "array-contains", uid).get();
  const wingIds = wingsSnap.docs.map((d) => d.id);
  const wingNames = wingsSnap.docs.map((d) => ({ id: d.id, name: d.data().name }));

  // Update user document with wingIds
  await db.collection("users").doc(uid).update({ wingIds });

  return NextResponse.json({ ok: true, uid, wingIds, wingNames });
}
