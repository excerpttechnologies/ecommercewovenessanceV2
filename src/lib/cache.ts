/**
 * Small process-wide TTL cache for read-only ERP metadata.
 *
 * Use it ONLY for data that is identical for every visitor and does not depend on the
 * request, the user, the cart, stock reservations, prices or payment state. Never use it
 * for authenticated responses, carts, wishlists, orders or anything keyed by a cookie.
 *
 * Behaviour:
 *  - a value is served until its TTL expires, then reloaded;
 *  - concurrent misses for the same key share one in-flight promise (no duplicate queries);
 *  - failures are NOT cached, so an ERP hiccup never sticks for the whole TTL;
 *  - entries are capped, so a runaway set of keys cannot grow without bound.
 */

type Entry = { value: unknown; expiresAt: number };

type CacheState = {
  entries: Map<string, Entry>;
  inflight: Map<string, Promise<unknown>>;
};

const g = globalThis as unknown as { __appTtlCache?: CacheState };
const state: CacheState = g.__appTtlCache ?? (g.__appTtlCache = { entries: new Map(), inflight: new Map() });

/** Hard cap on stored keys. Well above the number of distinct groups/endpoints we cache. */
const MAX_ENTRIES = 500;

function prune() {
  if (state.entries.size < MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of state.entries) {
    if (entry.expiresAt <= now) state.entries.delete(key);
  }
  // Still too big (everything is fresh): drop the oldest third, Map preserves insertion order.
  if (state.entries.size >= MAX_ENTRIES) {
    let drop = Math.ceil(state.entries.size / 3);
    for (const key of state.entries.keys()) {
      if (drop-- <= 0) break;
      state.entries.delete(key);
    }
  }
}

/** Cached read-through. `key` must include every input that changes the result. */
export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = state.entries.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value as T);

  const pending = state.inflight.get(key);
  if (pending) return pending as Promise<T>;

  const run = load()
    .then((value) => {
      prune();
      state.entries.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
      return value;
    })
    .finally(() => state.inflight.delete(key));
  state.inflight.set(key, run as Promise<unknown>);
  return run;
}

/** Drop every entry whose key starts with `prefix` (e.g. after an admin edit). */
export function invalidateCache(prefix: string) {
  for (const key of state.entries.keys()) {
    if (key.startsWith(prefix)) state.entries.delete(key);
  }
}

/** Test/ops helper: clear everything. */
export function clearCache() {
  state.entries.clear();
  state.inflight.clear();
}

/** Number of live entries (for diagnostics only). */
export function cacheSize() {
  return state.entries.size;
}
