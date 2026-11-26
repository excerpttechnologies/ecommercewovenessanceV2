import mongoose, { type Connection } from "mongoose";
import { env } from "./env";

/**
 * Two connections:
 *  - web    : website-owned collections (orders, carts, banners, CMS, admin…). Always writable.
 *  - master : products / categories / stores. In `mock` mode this IS the web
 *             connection (seeded locally). In `erp` mode it is RetailERP, read-only.
 *
 * Cached on globalThis so Next.js hot reloads don't open new sockets.
 */
type Cache = { web?: Promise<Connection>; erp?: Promise<Connection>; erpWrite?: Promise<Connection> };
const g = globalThis as unknown as { __wovenConns?: Cache };
const cache: Cache = g.__wovenConns ?? (g.__wovenConns = {});

mongoose.set("strictQuery", false);

const COMMON = { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 } as const;

/** Open a connection; if it fails, forget it so the next request retries. */
function open(key: keyof Cache, uri: string, opts: Record<string, unknown>): Promise<Connection> {
  const p = mongoose.createConnection(uri, { ...COMMON, ...opts }).asPromise();
  p.catch(() => {
    if (cache[key] === p) cache[key] = undefined;
  });
  
  p.then((connection) => {
    const forgetClosedConnection = () => {
      if (cache[key] === p) cache[key] = undefined;
    };
    connection.once("disconnected", forgetClosedConnection);
    connection.once("close", forgetClosedConnection);
  }).catch(() => {
    // Initial connection failures are handled by the catch above.
  });
  return p;
}

async function connectionFor(key: keyof Cache, openConnection: () => Promise<Connection>): Promise<Connection> {
  const existing = cache[key];
  if (existing) {
    try {
      const connection = await existing;
      if (connection.readyState === 1) return connection;
    } catch {
      // A stale/failed promise is replaced below.
    }
  }

  const next = openConnection();
  cache[key] = next;
  return next;
}

export function getWebConnection(): Promise<Connection> {
  return connectionFor("web", () => open("web", env.MONGODB_URI, { dbName: env.WEB_DB_NAME }));
}

/** RetailERP database (ERP_MONGODB_URI + ERP_DB_NAME), whatever DATA_SOURCE says. Read-only by convention. */
export function getErpConnection(): Promise<Connection> {
  return connectionFor("erp", () => open("erp", env.ERP_MONGODB_URI, {
    dbName: env.ERP_DB_NAME,
    readPreference: "secondaryPreferred",
  }));
}

/** RetailERP database write connection (primary readPreference) for authoritative inventory transactions and audit ledger. */
export function getErpWriteConnection(): Promise<Connection> {
  return (cache.erpWrite ??= open("erpWrite", env.ERP_MONGODB_URI, {
    dbName: env.ERP_DB_NAME,
    readPreference: "primary",
  }));
}

export function getMasterConnection(): Promise<Connection> {
  if (env.DATA_SOURCE === "erp" || Boolean(process.env.ERP_MONGODB_URI || process.env.ERP_MONGO_URI)) {
    return getErpConnection();
  }
  return getWebConnection();
}

/** For logs: hides the user:password part of any MongoDB URI that ends up inside an error message. */
export const redactMongoUri = (s: string) => s.replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, "$1***@");

export async function closeConnections() {
  const conns = await Promise.all([cache.web, cache.erp, cache.erpWrite].filter(Boolean));
  await Promise.all(conns.map((c) => c?.close()));
  cache.web = undefined;
  cache.erp = undefined;
  cache.erpWrite = undefined;
}

export const isValidObjectId = (id: string) => mongoose.isValidObjectId(id);
export const toObjectIdOrString = (id: string) =>
  mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;
