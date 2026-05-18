import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  const base = req.nextUrl.origin;
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: `${base}/api/fitness/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/fitness.activity.read",
    access_type: "offline",
    prompt: "consent",
    state: uid,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
