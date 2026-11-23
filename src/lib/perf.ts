/**
 * Server-side performance instrumentation.
 *
 * Records only timings and sizes — never request bodies, headers, cookies, tokens,
 * passwords, OTPs, payment credentials or customer data. Safe to leave enabled.
 *
 * Set PERF_LOG=1 to log every measured block; otherwise only blocks slower than
 * PERF_SLOW_MS (default 1000 ms) are logged.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

export type PerfContext = {
  dbMs: number;
  externalMs: number;
  stages: Record<string, number>;
};

const storage = new AsyncLocalStorage<PerfContext>();

export function getPerfContext(): PerfContext | undefined {
  return storage.getStore();
}

export function perfLogEnabled() {
  return process.env.PERF_LOG === "1";
}

export function slowThresholdMs() {
  const raw = Number(process.env.PERF_SLOW_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 1000;
}

/** Run `fn` with a timing context; returns the value and the collected timings. */
export async function withPerf<T>(fn: (ctx: PerfContext) => Promise<T>): Promise<{ value: T; ctx: PerfContext }> {
  const ctx: PerfContext = { dbMs: 0, externalMs: 0, stages: {} };
  const value = await storage.run(ctx, () => fn(ctx));
  return { value, ctx };
}

/** Time a database round-trip inside the current context. */
export async function measureDb<T>(fn: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await fn();
  } finally {
    const ctx = storage.getStore();
    if (ctx) ctx.dbMs += performance.now() - started;
  }
}

/** Time an outbound HTTP call (ERP image probes, payment/notification APIs, …). */
export async function measureExternal<T>(fn: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await fn();
  } finally {
    const ctx = storage.getStore();
    if (ctx) ctx.externalMs += performance.now() - started;
  }
}

export type PerfFields = Record<string, string | number | boolean | null | undefined>;

/** One JSON line, prefixed so it can be grepped or shipped to a log collector. */
export function logPerf(scope: string, fields: PerfFields) {
  const parts = [`scope=${scope}`];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    parts.push(`${key}=${typeof value === "string" && /[^\w./:-]/.test(value) ? JSON.stringify(value) : value}`);
  }
  console.info(`[perf] ${parts.join(" ")}`);
}

/** Log when PERF_LOG=1 or when the block was slow. */
export function logPerfIfSlow(scope: string, totalMs: number, fields: PerfFields) {
  if (perfLogEnabled() || totalMs >= slowThresholdMs()) logPerf(scope, { ...fields, ms: Math.round(totalMs) });
}

/** Milliseconds with one decimal, for compact logs. */
export const ms = (value: number) => Math.round(value * 10) / 10;
