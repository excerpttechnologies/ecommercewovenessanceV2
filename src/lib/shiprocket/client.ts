import { ShiprocketError } from "./errors";
import type { ShiprocketConfig } from "./types";

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

interface AuthCircuit {
  openUntil: number;
  reason: string;
  status?: number;
}

interface ClientState {
  tokenCache: Map<string, TokenCacheEntry>;
  loginFlights: Map<string, Promise<string>>;
  authCircuits: Map<string, AuthCircuit>;
}

/**
 * Shared across hot reloads in development. In production one instance exists
 * per Node.js process. No Redis/external infrastructure is required.
 */
const globalState = globalThis as unknown as { __shiprocketClientState?: ClientState };
const state =
  globalState.__shiprocketClientState ??
  (globalState.__shiprocketClientState = {
    tokenCache: new Map(),
    loginFlights: new Map(),
    authCircuits: new Map(),
  });

/** Shiprocket tokens are valid for ~10 days; refresh comfortably early. */
const TOKEN_TTL_MS = 8 * 24 * 60 * 60 * 1000;

/** Block new login attempts for 10 minutes after an authentication failure. */
export const AUTH_COOLDOWN_MS = 10 * 60 * 1000;

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

/** Strip credentials/tokens and line breaks before anything reaches a log. */
function sanitizeForLog(value: unknown, secrets: string[] = []): string {
  let text = typeof value === "string" ? value : String(value ?? "");
  for (const secret of secrets) {
    if (secret) text = text.split(secret).join("[redacted]");
  }
  return text
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/"/g, "'")
    .slice(0, 300);
}

function isAuthFailure(status: number, message: string): boolean {
  if (status === 401 || status === 403) return true;
  return /block|too many failed|too many attempts|attempt limit|suspended|disabled|invalid (email|password|credentials)/i.test(
    message,
  );
}

function authCooldownSeconds(openUntil: number): number {
  return Math.max(1, Math.ceil((openUntil - Date.now()) / 1000));
}

function openAuthCircuit(key: string, reason: string, status?: number) {
  const openUntil = Date.now() + AUTH_COOLDOWN_MS;
  state.authCircuits.set(key, { openUntil, reason, status });
  console.warn(
    `[shiprocket] operation=shiprocket_login circuit=open status=${status ?? "n/a"} ` +
      `cooldownSec=${Math.round(AUTH_COOLDOWN_MS / 1000)} reason="${sanitizeForLog(reason)}"`,
  );
}

function closeAuthCircuit(key: string) {
  state.authCircuits.delete(key);
}

async function performLogin(config: ShiprocketConfig): Promise<string> {
  const key = cacheKey(config);
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: config.email, password: config.password }),
      signal: timeoutSignal(Math.min(config.timeoutMs, 15_000)),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    console.warn(
      `[shiprocket] operation=shiprocket_login status=network durationMs=${Date.now() - started} ` +
        `success=false circuit=closed message="${timedOut ? "login request timed out" : "login network error"}"`,
    );
    throw new ShiprocketError(
      timedOut ? "SHIPROCKET_TIMEOUT" : "SHIPROCKET_NETWORK_ERROR",
      timedOut ? "Shiprocket login did not respond in time." : "Could not reach Shiprocket to authenticate.",
      { status: 504, retryable: true },
    );
  }

  const body = await readJson(res);
  const durationMs = Date.now() - started;
  const rawMessage =
    typeof body.message === "string"
      ? body.message
      : typeof body.error === "string"
        ? body.error
        : `HTTP ${res.status}`;
  const message = sanitizeForLog(rawMessage, [config.password, config.email]);
  const token = typeof body.token === "string" ? body.token : "";

  if (!res.ok || !token) {
    const authFailure = isAuthFailure(res.status, rawMessage);
    const code =
      res.status === 401
        ? "SHIPROCKET_AUTH_FAILED"
        : res.status === 403
          ? "SHIPROCKET_AUTH_BLOCKED"
          : "SHIPROCKET_LOGIN_FAILED";
    if (authFailure) openAuthCircuit(key, message, res.status);
    console.warn(
      `[shiprocket] operation=shiprocket_login status=${res.status} durationMs=${durationMs} ` +
        `success=false cached=false circuit=${authFailure ? "open" : "closed"} message="${message}"`,
    );
    throw new ShiprocketError(
      code,
      `Shiprocket login failed (HTTP ${res.status}): ${message}`,
      { status: authFailure ? 503 : 502, retryable: false, upstreamStatus: res.status },
    );
  }

  state.tokenCache.set(key, { token, expiresAt: Date.now() + TOKEN_TTL_MS });
  closeAuthCircuit(key);
  console.info(
    `[shiprocket] operation=shiprocket_login status=${res.status} durationMs=${durationMs} ` +
      `success=true cached=false circuit=closed`,
  );
  return token;
}

/**
 * Reuse cached tokens, share one in-flight login across concurrent requests,
 * and never attempt a login while the authentication circuit is open.
 */
async function login(config: ShiprocketConfig): Promise<string> {
  const key = cacheKey(config);

  const cached = state.tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    console.info("[shiprocket] operation=shiprocket_login cached=true circuit=closed");
    return cached.token;
  }

  const circuit = state.authCircuits.get(key);
  if (circuit) {
    if (circuit.openUntil > Date.now()) {
      console.warn(
        `[shiprocket] operation=shiprocket_login circuit=open skipped=true ` +
          `retryAfterSec=${authCooldownSeconds(circuit.openUntil)} reason="${sanitizeForLog(circuit.reason)}"`,
      );
      throw new ShiprocketError(
        "SHIPROCKET_AUTH_COOLDOWN",
        `Shiprocket login is paused for ${Math.ceil(AUTH_COOLDOWN_MS / 60_000)} minutes after an authentication failure.`,
        { status: 503, retryable: false },
      );
    }
    state.authCircuits.delete(key);
  }

  const inFlight = state.loginFlights.get(key);
  if (inFlight) return inFlight;

  const entry: { promise?: Promise<string> } = {};
  const tracked = performLogin(config).then(
    (token) => {
      if (state.loginFlights.get(key) === entry.promise) state.loginFlights.delete(key);
      return token;
    },
    (error) => {
      if (state.loginFlights.get(key) === entry.promise) state.loginFlights.delete(key);
      throw error;
    },
  );
  entry.promise = tracked;
  state.loginFlights.set(key, tracked);
  return tracked;
}

function clearToken(config: ShiprocketConfig) {
  state.tokenCache.delete(cacheKey(config));
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
 * - in-process token cache (8 days), shared login promise and one re-login on 401
 * - a 10-minute authentication circuit breaker (no retry loops while open)
 * - timeouts
 * - bounded retries for safe/transient failures only (login is never retried)
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
    // Authentication failures are never retried here: login() owns the token
    // cache and the circuit breaker, so a bad credential cannot create a loop.
    const token = await login(config);

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
      console.warn(
        `[shiprocket] ${method} ${path.split("?")[0]} ${timedOut ? "timeout" : "network error"} ` +
          `(${Date.now() - started}ms)`,
      );
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
      const message = sanitizeForLog(
        typeof body.message === "string" ? body.message : `HTTP ${res.status}`,
        [config.password, config.email],
      );
      const errors = body.errors && typeof body.errors === "object"
        ? sanitizeForLog(JSON.stringify(body.errors), [config.password, config.email])
        : "";
      throw new ShiprocketError(
        res.status === 401 ? "SHIPROCKET_AUTH_FAILED" : res.status === 429 ? "SHIPROCKET_RATE_LIMITED" : "SHIPROCKET_API_ERROR",
        `Shiprocket (HTTP ${res.status}): ${message}${errors ? ` (${errors})` : ""}`,
        { status: res.status === 429 ? 429 : 502, retryable, details: body.errors, upstreamStatus: res.status },
      );
    }

    return body as T;
  }
}

/** Test-only: reset tokens, in-flight logins and circuit state between cases. */
export function resetShiprocketClientState() {
  state.tokenCache.clear();
  state.loginFlights.clear();
  state.authCircuits.clear();
}
