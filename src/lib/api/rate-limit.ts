/**
 * Small in-process rate limiter for public endpoints (pincode checks, quotes).
 * Not a replacement for an edge/WAF limit, but it stops casual hammering of a
 * paid courier API. State is per server instance.
 */

interface Bucket {
  hits: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function clientKey(req: Request, scope: string): string {
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

/** Fixed-window limiter. `limit` requests per `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  if (existing.hits >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.hits += 1;
  return { ok: true, remaining: Math.max(0, limit - existing.hits), retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
}

/** Test helper — clears all buckets. */
export function resetRateLimits() {
  buckets.clear();
}
