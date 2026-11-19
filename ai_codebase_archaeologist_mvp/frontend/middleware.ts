import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "vi"] as const;
const DEFAULT_LOCALE = "en";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static assets, api routes, and Next internal files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Determine current locale from cookie or path
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const currentLocale = LOCALES.includes(cookieLocale as any) ? cookieLocale : DEFAULT_LOCALE;

  // Root path: redirect to default or cookie locale
  if (pathname === "/") {
    const sessionToken = request.cookies.get("session_token")?.value;
    const target = sessionToken ? `/${currentLocale}` : `/${currentLocale}/login`;
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Check if pathname starts with a supported locale
  const pathnameHasLocale = LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    return NextResponse.redirect(
      new URL(`/${currentLocale}${pathname.startsWith("/") ? "" : "/"}${pathname}`, request.url)
    );
  }

  // Extract locale and subpath
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0];
  const subpath = segments.slice(1).join("/");

  // Login pages are always public
  if (subpath === "login") {
    return NextResponse.next();
  }

  // Protected application routes: redirect unauthenticated users to login
  const sessionToken = request.cookies.get("session_token")?.value;
  if (!sessionToken && (subpath === "repositories" || subpath.startsWith("repos/"))) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
