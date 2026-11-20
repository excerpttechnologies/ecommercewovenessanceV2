import { NextResponse } from "next/server";

/** Consistent API envelope: { ok, data, meta } | { ok:false, error:{code,message,details} } */
export function ok<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data, ...(meta ? { meta } : {}) }, init);
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } }, { status });
}

/** Wrap a route handler so thrown errors become the standard envelope. */
export function handler<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      console.error("[api]", err);
      return fail(err.code ?? "INTERNAL_ERROR", err.message || "Something went wrong", err.status ?? 500);
    }
  };
}
