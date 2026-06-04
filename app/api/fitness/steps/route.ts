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

  if (!tokenRes.ok) {
    const tokenErr = await tokenRes.text();
    console.error("Google token refresh failed:", tokenErr);
    // Token expired/revoked — clear it so user re-connects
    if (tokenRes.status === 400 || tokenRes.status === 401) {
      await admin.firestore().doc(`users/${uid}`).update({ googleFitRefreshToken: admin.firestore.FieldValue.delete() });
      return NextResponse.json({ connected: false, error: "token_expired" });
    }
    return NextResponse.json({ connected: true, steps: null });
  }

  const tokenData = await tokenRes.json();
  const access_token = tokenData.access_token;
  if (!access_token) {
    console.error("No access_token in response:", tokenData);
    return NextResponse.json({ connected: true, steps: null });
  }

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

  if (!fitRes.ok) {
    const fitErr = await fitRes.text();
    console.error("Google Fit API error:", fitRes.status, fitErr);
    return NextResponse.json({ connected: true, steps: null, fitError: fitRes.status });
  }

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
