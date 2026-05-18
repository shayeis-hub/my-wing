import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const uid = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !uid) {
    return NextResponse.redirect(`${base}/steps?fitError=1`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: `${base}/api/fitness/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/steps?fitError=1`);
  }

  const { refresh_token } = await tokenRes.json();
  if (!refresh_token) {
    return NextResponse.redirect(`${base}/steps?fitError=noRefresh`);
  }

  getAdminApp();
  await admin.firestore().doc(`users/${uid}`).update({ googleFitRefreshToken: refresh_token });

  return NextResponse.redirect(`${base}/steps?fitConnected=1`);
}
