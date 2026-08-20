import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "@/lib/session";

// Paths that must always be reachable without a valid session.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/keep-alive"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await isValidSessionToken(cookieValue);

  if (authenticated) {
    return NextResponse.next();
  }

  // API routes get a clean 401 instead of an HTML redirect.
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized. Please unlock the app first." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
