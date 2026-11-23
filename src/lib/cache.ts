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
  inflightOnly: Map<string, Promise<unknown>>;
};

const g = globalThis as unknown as { __appTtlCache?: CacheState };
const state: CacheState = g.__appTtlCache ?? (g.__appTtlCache = { entries: new Map(), inflight: new Map(), inflightOnly: new Map() });
state.inflightOnly ??= new Map();

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

/**
 * Deterministic JSON for cache keys: object keys are sorted, array order is
 * treated as a set (filters), and undefined values are dropped.
 */
export function stableKey(value: unknown): string {
  return JSON.stringify(normalizeKey(value));
}

function normalizeKey(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(normalizeKey)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const next = normalizeKey(source[key]);
        if (next !== undefined) acc[key] = next;
        return acc;
      }, {});
  }
  return value;
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

/** Share concurrent work without retaining its result after the load completes. */
export function deduplicateInFlight<T>(key: string, load: () => Promise<T>): Promise<T> {
  const pending = state.inflightOnly.get(key);
  if (pending) return pending as Promise<T>;

  const run = load().finally(() => state.inflightOnly.delete(key));
  state.inflightOnly.set(key, run as Promise<unknown>);
  return run;
}

/** Drop every entry whose key starts with `prefix` (e.g. after an admin edit). */
export function invalidateCache(prefix: string) {
  for (const key of state.entries.keys()) {
    if (key.startsWith(prefix)) state.entries.delete(key);
  }
}

/** Drop every entry whose key starts with any of the given `prefixes`. */
export function invalidateCachePrefixes(prefixes: readonly string[] | string[]) {
  for (const key of state.entries.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) {
      state.entries.delete(key);
    }
  }
}

/**
 * Stale-while-revalidate cache read-through.
 * - While within TTL: returns cached value immediately.
 * - Between TTL and TTL + staleMs: returns cached stale value immediately and refreshes in background.
 * - Beyond TTL + staleMs or miss: awaits load().
 */
export function cachedSWR<T>(
  key: string,
  ttlMs: number,
  staleMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = state.entries.get(key);
  const now = Date.now();

  if (hit) {
    const isFresh = hit.expiresAt > now;
    const isStaleValid = now <= hit.expiresAt + Math.max(0, staleMs);

    if (isFresh) {
      return Promise.resolve(hit.value as T);
    }

    if (isStaleValid) {
      if (!state.inflight.has(key)) {
        const bgRun = load()
          .then((value) => {
            prune();
            state.entries.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
            return value;
          })
          .catch((err) => {
            console.warn("[cache] SWR background refresh failed", key, (err as Error)?.message);
            return hit.value as T;
          })
          .finally(() => state.inflight.delete(key));
        state.inflight.set(key, bgRun as Promise<unknown>);
      }
      return Promise.resolve(hit.value as T);
    }
  }

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

/** Test/ops helper: clear everything. */
export function clearCache() {
  state.entries.clear();
  state.inflight.clear();
  state.inflightOnly.clear();
}

/** Number of live entries (for diagnostics only). */
export function cacheSize() {
  return state.entries.size;
}
