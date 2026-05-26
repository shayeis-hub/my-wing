import { NextRequest, NextResponse } from "next/server";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

function getPaddle() {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY env var is missing");
  const isProd = process.env.NODE_ENV === "production";
  return new Paddle(key, {
    environment: isProd ? Environment.production : Environment.sandbox,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId, action = "cancel" } = (await req.json()) as {
      userId: string;
      action?: "cancel" | "update_payment";
    };

    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    getAdminApp();
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const sub = userDoc.data()?.subscription ?? {};
    const subscriptionId: string | undefined = sub.paddleSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const paddle = getPaddle();
    const subscription = await paddle.subscriptions.get(subscriptionId);

    // Paddle exposes management URLs on the subscription object
    const mgmt = (subscription as unknown as {
      managementUrls?: { cancel?: string; updatePaymentMethod?: string };
    }).managementUrls;

    const url =
      action === "update_payment"
        ? mgmt?.updatePaymentMethod
        : mgmt?.cancel;

    if (!url) {
      return NextResponse.json({ error: "Management URL not available" }, { status: 404 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Create Paddle portal error:", err);
    return NextResponse.json({ error: "Failed to get management URL" }, { status: 500 });
  }
}
