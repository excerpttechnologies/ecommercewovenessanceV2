import { ShiprocketError } from "./errors";
import type { ShiprocketConfig } from "./types";

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

const globalCache = globalThis as unknown as { __shiprocketTokenCache?: Map<string, TokenCacheEntry> };
const tokenCache = globalCache.__shiprocketTokenCache ?? (globalCache.__shiprocketTokenCache = new Map());

function cacheKey(config: ShiprocketConfig): string {
  return `${config.baseUrl}|${config.email}`;
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 300) };
  }
}

async function login(config: ShiprocketConfig): Promise<string> {
  const key = cacheKey(config);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const res = await fetch(`${config.baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: config.email, password: config.password }),
    signal: timeoutSignal(Math.min(config.timeoutMs, 15_000)),
  });
  const body = await readJson(res);
  if (!res.ok || typeof body.token !== "string" || !body.token) {
    const message = typeof body.message === "string" ? body.message : `HTTP ${res.status}`;
    throw new ShiprocketError(
      res.status === 401 ? "SHIPROCKET_AUTH_FAILED" : "SHIPROCKET_LOGIN_FAILED",
      `Shiprocket login failed: ${message}`,
      { status: res.status === 401 ? 503 : 502, retryable: res.status >= 500 },
    );
  }
  // Shiprocket tokens are valid for ~10 days; refresh comfortably early.
  tokenCache.set(key, { token: body.token, expiresAt: Date.now() + 8 * 24 * 60 * 60 * 1000 });
  return body.token;
}

function clearToken(config: ShiprocketConfig) {
  tokenCache.delete(cacheKey(config));
}

export interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Safe requests (GET) are retried on transient failures. Mutations are only retried after a 401. */
  safe?: boolean;
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Authenticated Shiprocket request with:
 * - in-process token cache (8 days) and one forced re-login on 401
 * - timeouts
 * - bounded retries for safe/transient failures only
 * - sanitised errors and logs (no tokens, credentials or address payloads)
 */
export async function shiprocketRequest<T = Record<string, unknown>>(
  config: ShiprocketConfig,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const safe = options.safe ?? method === "GET";
  const retries = safe ? Math.max(0, config.maxRetries) : 0;
  const url = `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  let authRetried = false;

  for (let attempt = 0; ; attempt += 1) {
    let token: string;
    try {
      token = await login(config);
    } catch (error) {
      if (attempt < retries) {
        await sleep(250 * 2 ** attempt);
        continue;
      }
      throw error;
    }

    const started = Date.now();
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: timeoutSignal(options.timeoutMs ?? config.timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
      console.warn(`[shiprocket] ${method} ${path} ${timedOut ? "timeout" : "network error"} (${Date.now() - started}ms)`);
      if (attempt < retries) {
        await sleep(250 * 2 ** attempt);
        continue;
      }
      throw new ShiprocketError(
        timedOut ? "SHIPROCKET_TIMEOUT" : "SHIPROCKET_NETWORK_ERROR",
        timedOut ? "Shiprocket did not respond in time. Please retry." : "Could not reach Shiprocket. Please retry.",
        { status: 504, retryable: true },
      );
    }

    const body = await readJson(res);

    if (res.status === 401 && !authRetried) {
      authRetried = true;
      clearToken(config);
      continue;
    }

    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      if (safe && retryable && attempt < retries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 300 * 2 ** attempt);
        continue;
      }
      const message = typeof body.message === "string" ? body.message : `HTTP ${res.status}`;
      const errors = body.errors && typeof body.errors === "object" ? JSON.stringify(body.errors).slice(0, 300) : "";
      throw new ShiprocketError(
        res.status === 401 ? "SHIPROCKET_AUTH_FAILED" : res.status === 429 ? "SHIPROCKET_RATE_LIMITED" : "SHIPROCKET_API_ERROR",
        `Shiprocket: ${message}${errors ? ` (${errors})` : ""}`,
        { status: res.status === 429 ? 429 : 502, retryable, details: body.errors },
      );
    }

    return body as T;
  }
}
