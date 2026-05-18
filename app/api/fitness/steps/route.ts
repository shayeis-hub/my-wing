import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  getAdminApp();
  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const refreshToken = userSnap.data()?.googleFitRefreshToken as string | undefined;

  if (!refreshToken) return NextResponse.json({ connected: false });

  // Exchange refresh token for fresh access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) return NextResponse.json({ connected: true, steps: null });

  const { access_token } = await tokenRes.json();

  // Use client-provided timestamps to respect local timezone
  const startParam = req.nextUrl.searchParams.get("start");
  const endParam = req.nextUrl.searchParams.get("end");
  const now = new Date();
  const startOfDay = startParam ? parseInt(startParam) : new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = endParam ? parseInt(endParam) : startOfDay + 86400000;

  const fitRes = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startOfDay,
        endTimeMillis: endOfDay,
      }),
    }
  );

  if (!fitRes.ok) return NextResponse.json({ connected: true, steps: null });

  const data = await fitRes.json();
  let steps = 0;
  for (const bucket of data.bucket ?? []) {
    for (const dataset of bucket.dataset ?? []) {
      for (const point of dataset.point ?? []) {
        for (const value of point.value ?? []) {
          steps += value.intVal ?? 0;
        }
      }
    }
  }

  return NextResponse.json({ connected: true, steps });
}
