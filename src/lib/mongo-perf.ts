/**
 * MongoDB command monitoring for Mongoose/driver connections.
 *
 * Measures the *server-side* command duration reported by the driver (`commandSucceeded.duration`,
 * milliseconds) — not the application's elapsed time — so a slow query is only reported as slow
 * when MongoDB actually took that long. Slow commands (default > 200 ms) are logged, and every
 * command is logged when `MONGO_PERF_LOG=1`.
 *
 * Safety: never logs query values, only the collection, operation, filter *field names*, sort
 * shape, limit and returned-document count. Sensitive collections (customers, orders, carts,
 * payments, OTPs, sessions, users) are reported without filter fields.
 *
 * Environment:
 *   MONGO_PERF_LOG=1        log every command (noisy; use for a short investigation)
 *   MONGO_PERF_SLOW_MS=200  slow threshold in milliseconds
 */
import type { MongoClient } from "mongodb";
import { getPerfContext } from "@/lib/perf";

const attached = new WeakSet<MongoClient>();

function slowThresholdMs() {
  const raw = Number(process.env.MONGO_PERF_SLOW_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 200;
}

function logEveryCommand() {
  return process.env.MONGO_PERF_LOG === "1" || process.env.PERF_LOG === "1";
}

/** Collections whose filter values could identify a person or an order. */
const SENSITIVE = /(customer|user|order|cart|wishlist|payment|otp|session|token|audit|enquir|review|account)/i;

type CommandLike = Record<string, unknown> & {
  find?: string;
  aggregate?: string | number;
  count?: string;
  distinct?: string;
  insert?: string;
  update?: string;
  delete?: string;
  findAndModify?: string;
  filter?: Record<string, unknown>;
  query?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  pipeline?: Array<Record<string, unknown>>;
};

function commandCollection(command: CommandLike, commandName: string): string | undefined {
  const value = command[commandName as keyof CommandLike];
  return typeof value === "string" ? value : undefined;
}

function matchFilter(command: CommandLike): Record<string, unknown> | undefined {
  if (command.filter) return command.filter;
  if (command.query) return command.query;
  const first = Array.isArray(command.pipeline) ? command.pipeline[0] : undefined;
  const match = first && typeof first === "object" ? (first.$match as Record<string, unknown> | undefined) : undefined;
  return match;
}

function filterKeys(filter: Record<string, unknown> | undefined): string | undefined {
  if (!filter) return undefined;
  const keys = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "$and" || key === "$or" || key === "$nor") {
        if (Array.isArray(child)) child.forEach(visit);
        continue;
      }
      if (key.startsWith("$")) continue;
      keys.add(key);
    }
  };
  visit(filter);
  return keys.size ? [...keys].slice(0, 8).join(",") : undefined;
}

function returnedCount(reply: unknown): number | undefined {
  if (!reply || typeof reply !== "object") return undefined;
  const r = reply as {
    n?: number;
    cursor?: { firstBatch?: unknown[]; nextBatch?: unknown[] };
  };
  if (typeof r.n === "number") return r.n;
  if (r.cursor) return (r.cursor.firstBatch?.length ?? 0) + (r.cursor.nextBatch?.length ?? 0);
  return undefined;
}

export function attachCommandMonitoring(client: MongoClient | undefined | null, label: string) {
  if (!client || attached.has(client)) return;
  attached.add(client);

  client.on("commandSucceeded", (event) => {
    const commandName = String(event.commandName ?? "");
    if (commandName === "getMore" || commandName === "killCursors" || commandName === "ping") return;
    const durationMs = Number(event.duration ?? 0);
    const slow = slowThresholdMs();
    if (!logEveryCommand() && durationMs < slow) return;

    const command = ((event as unknown as { command?: unknown }).command ?? {}) as CommandLike;
    const collection = commandCollection(command, commandName) ?? "unknown";
    const parts = [
      `collection=${collection}`,
      `operation=${commandName}`,
      `dbMs=${Math.round(durationMs)}`,
    ];
    const n = returnedCount(event.reply);
    if (n !== undefined) parts.push(`nReturned=${n}`);
    if (!SENSITIVE.test(collection)) {
      const keys = filterKeys(matchFilter(command));
      if (keys) parts.push(`filterKeys=${keys}`);
      if (command.sort && typeof command.sort === "object") parts.push(`sort=${Object.keys(command.sort).join(",")}`);
      if (typeof command.limit === "number") parts.push(`limit=${command.limit}`);
      if (typeof command.skip === "number" && command.skip > 0) parts.push(`skip=${command.skip}`);
    }
    if (getPerfContext()) parts.push("request=1");
    parts.push(`connection=${label}`);
    console.info(`[mongo] ${parts.join(" ")}`);
  });

  client.on("commandFailed", (event) => {
    const commandName = String(event.commandName ?? "");
    if (commandName === "getMore" || commandName === "killCursors" || commandName === "ping") return;
    const command = ((event as unknown as { command?: unknown }).command ?? {}) as CommandLike;
    const collection = commandCollection(command, commandName) ?? "unknown";
    const message = String((event as { failure?: { message?: string } }).failure?.message ?? "command failed");
    // Failure messages can contain values; keep only the error code/name-ish prefix.
    console.warn(`[mongo] collection=${collection} operation=${commandName} failed=${message.split("\n")[0].slice(0, 160)} connection=${label}`);
  });
}
