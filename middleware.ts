import { NextRequest, NextResponse } from "next/server";

// onehabit.wingpact.app is attached to this same Vercel project (same app,
// same deploy) — this rewrite makes its root serve the book-mode landing
// page instead of the regular app homepage. Everything else on that host
// (e.g. /dashboard if someone's already logged in) still resolves normally.
//
// The Hebrew book prints just "onehabit.wingpact.app", so the root serves the
// Hebrew page to browsers whose primary language is Hebrew; "/?lang=en" opts
// back into English. "/he" is always the Hebrew page.
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (host !== "onehabit.wingpact.app") return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/he") {
    return NextResponse.rewrite(new URL("/onehabit/he", request.url));
  }

  if (pathname === "/") {
    const prefersHebrew = /^\s*(he|iw)\b/i.test(request.headers.get("accept-language") || "");
    const target = prefersHebrew && searchParams.get("lang") !== "en" ? "/onehabit/he" : "/onehabit";
    const res = NextResponse.rewrite(new URL(target, request.url));
    res.headers.set("Vary", "Accept-Language");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/he"],
};
