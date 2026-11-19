import { NextResponse } from "next/server";
import { logPerf, perfLogEnabled, slowThresholdMs } from "@/lib/perf";

/** Lazily computed response sizes, keyed by the response itself (no body cloning needed). */
const payloads = new WeakMap<Response, () => number>();
const encoder = new TextEncoder();

function rememberSize(res: Response, payload: unknown) {
  payloads.set(res, () => encoder.encode(JSON.stringify(payload)).length);
}

/** Consistent API envelope: { ok, data, meta } | { ok:false, error:{code,message,details} } */
export function ok<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit) {
  const payload = { ok: true, data, ...(meta ? { meta } : {}) };
  const res = NextResponse.json(payload, init);
  rememberSize(res, payload);
  return res;
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  const payload = { ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } };
  const res = NextResponse.json(payload, { status });
  rememberSize(res, payload);
  return res;
}

type TimingRequest = { method?: unknown; url?: unknown };

function describe(args: unknown[]): { method: string; path: string } {
  // Route handlers receive the NextRequest as their first argument even when the callback
  // declares no parameters. Only the method and pathname are read: never headers, cookies,
  // query strings, bodies or tokens.
  const request = args[0] as TimingRequest | undefined;
  let method = "-";
  let path = "-";
  if (request && typeof request === "object") {
    if (typeof request.method === "string") method = request.method;
    if (typeof request.url === "string") {
      try {
        path = new URL(request.url).pathname;
      } catch {
        path = "-";
      }
    }
  }
  return { method, path };
}

function logApi(method: string, path: string, res: Response, durationMs: number) {
  if (!perfLogEnabled() && durationMs < slowThresholdMs() && res.status < 400) return;
  logPerf("api", {
    method,
    path,
    status: res.status,
    ms: Math.round(durationMs * 10) / 10,
    bytes: payloads.get(res)?.(),
  });
}

/** Wrap a route handler so thrown errors become the standard envelope. */
export function handler<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    const started = performance.now();
    const { method, path } = describe(args);
    try {
      const res = await fn(...args);
      logApi(method, path, res, performance.now() - started);
      return res;
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      console.error("[api]", err);
      const res = fail(err.code ?? "INTERNAL_ERROR", err.message || "Something went wrong", err.status ?? 500);
      logApi(method, path, res, performance.now() - started);
      return res;
    }
  };
}
