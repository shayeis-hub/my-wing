import { NextRequest, NextResponse } from "next/server";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { PADDLE_PRICES } from "@/lib/subscription";

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
    const { priceType, userId } = (await req.json()) as {
      priceType: "monthly" | "yearly";
      userId: string;
    };

    if (!userId || !priceType) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const priceId = priceType === "yearly" ? PADDLE_PRICES.yearly : PADDLE_PRICES.monthly;
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    getAdminApp();
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() ?? {};
    const email: string = userData.email ?? "";
    const displayName: string = userData.displayName ?? "";

    const paddle = getPaddle();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://my-wing.vercel.app";

    // Reuse existing Paddle customer or create one
    let paddleCustomerId: string | undefined = userData?.subscription?.paddleCustomerId;

    if (!paddleCustomerId && email) {
      // Look up by email first
      const existing = paddle.customers.list({ email: [email] });
      for await (const customer of existing) {
        paddleCustomerId = customer.id;
        break;
      }
      // Create if not found
      if (!paddleCustomerId) {
        const created = await paddle.customers.create({
          email,
          name: displayName || undefined,
        });
        paddleCustomerId = created.id;
        // Persist early so webhook can correlate
        await db.collection("users").doc(userId).set(
          { subscription: { paddleCustomerId, plan: "free" } },
          { merge: true }
        );
      }
    }

    // Create a one-time checkout transaction
    const txBody: Parameters<typeof paddle.transactions.create>[0] = {
      items: [{ priceId, quantity: 1 }],
      customData: { firebaseUid: userId } as Record<string, string>,
      checkout: { url: `${baseUrl}/subscription?success=1` },
    };
    if (paddleCustomerId) {
      txBody.customerId = paddleCustomerId;
    }

    const transaction = await paddle.transactions.create(txBody);

    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Create Paddle checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
