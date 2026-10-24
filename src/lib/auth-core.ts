import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import type { Permission } from "@/models/web/commerce.models";

/** Edge-safe auth primitives (no next/headers) — used by middleware and route helpers. */
const JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16 ? process.env.JWT_SECRET : "dev-only-secret-change-me-please-now";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
const IS_PROD = process.env.NODE_ENV === "production";

export const CUSTOMER_COOKIE = "we_session";
export const ADMIN_COOKIE = "we_admin";
export const CART_COOKIE = "we_cart";

export interface CustomerSession {
  kind: "customer";
  sub: string; // customer id
  mobile?: string; // set for OTP logins, or when given at registration
  email?: string; // set for email + password logins
  name?: string;
}
export interface AdminSession {
  kind: "admin";
  sub: string; // admin user id
  email: string;
  name: string;
  role: string; // role slug
  permissions: Permission[];
}
export type Session = CustomerSession | AdminSession;

const secret = () => new TextEncoder().encode(JWT_SECRET);

export async function signSession(payload: Session, expiresIn = JWT_EXPIRES_IN): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifySession<T extends Session>(token: string | undefined, kind: T["kind"]): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== kind) return null;
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: IS_PROD,
  path: "/",
  maxAge: maxAgeSeconds,
});


/** Edge-safe variant for middleware (no next/headers). */
export async function sessionFromRequest<T extends Session>(req: NextRequest, kind: T["kind"]): Promise<T | null> {
  const name = kind === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE;
  return verifySession<T>(req.cookies.get(name)?.value, kind);
}
