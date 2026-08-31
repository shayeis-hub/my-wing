import { NextRequest, NextResponse } from "next/server";

// onehabit.wingpact.app is attached to this same Vercel project (same app,
// same deploy) — this rewrite makes its root serve the book-mode landing
// page instead of the regular app homepage. Everything else on that host
// (e.g. /dashboard if someone's already logged in) still resolves normally.
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (host === "onehabit.wingpact.app" && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/onehabit", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
