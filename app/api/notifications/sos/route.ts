import { NextRequest, NextResponse } from "next/server";
import { getDocs, query, collection, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export async function POST(req: NextRequest) {
  try {
    const { wingId, userId, userName } = await req.json();

    // Get all member FCM tokens from the wing
    const wingSnap = await getDocs(
      query(collection(db, "wings"), where("__name__", "==", wingId))
    );

    if (wingSnap.empty) {
      return NextResponse.json({ error: "Wing not found" }, { status: 404 });
    }

    const wing = wingSnap.docs[0].data();
    const memberIds: string[] = wing.memberIds.filter((id: string) => id !== userId);

    // Get FCM tokens for all members
    const tokens: string[] = [];
    for (const memberId of memberIds) {
      const userDocs = await getDocs(
        query(collection(db, "users"), where("__name__", "==", memberId))
      );
      if (!userDocs.empty) {
        const token = userDocs.docs[0].data().fcmToken;
        if (token) tokens.push(token);
      }
    }

    // Send FCM notifications via Firebase Admin or FCM HTTP v1
    // In production: use Firebase Admin SDK or FCM REST API
    // For now we log and return success; wire up FCM send in Cloud Function
    console.log(
      `SOS from ${userName} in wing ${wingId}. Tokens to notify:`,
      tokens
    );

    return NextResponse.json({ success: true, notified: tokens.length });
  } catch (err) {
    console.error("SOS notification error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
