import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "bitakra_session";
const DAY_COOKIE = "bitakra_day";
const AR_TZ = "America/Argentina/Buenos_Aires";

function arToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const day = request.cookies.get(DAY_COOKIE)?.value;
  const valid = !!token && day === arToday();

  if (pathname.startsWith("/bitacora") && !valid) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/" && valid) {
    const url = request.nextUrl.clone();
    url.pathname = "/bitacora";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/bitacora/:path*"],
};