import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, CUSTOMER_COOKIE, verifySession, type AdminSession, type CustomerSession } from "@/lib/auth-core";

/**
 * - Protects /admin/* (except /admin/login) with the admin JWT cookie.
 * - Redirects unauthenticated /account/* to /login.
 * - Exposes x-pathname to server components (used for post-login redirects).
 * - Adds baseline security headers.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const s = await verifySession<AdminSession>(req.cookies.get(ADMIN_COOKIE)?.value, "admin");
    if (!s) return NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(pathname)}`, req.url));
  }
  if (pathname.startsWith("/account")) {
    const s = await verifySession<CustomerSession>(req.cookies.get(CUSTOMER_COOKIE)?.value, "customer");
    if (!s) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  }

  const res = NextResponse.next({ request: { headers } });
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|mock/).*)"] };
