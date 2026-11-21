/**
 * Index migration — SAFE, ADD-ONLY.
 *
 *   npx tsx scripts/migrate-indexes.ts            # dry run (default): print what is missing
 *   npx tsx scripts/migrate-indexes.ts --apply     # create only the missing indexes
 *
 * Connects to the same two MongoDB databases the app uses (web + RetailERP), checks the
 * existing indexes first, and creates only indexes whose key pattern is absent. It never
 * drops, modifies or renames an existing index, and never writes application data.
 *
 * Creating an index on a large collection can be slow; run this in a maintenance window on
 * the replica-set primary. `createIndex` is idempotent, so re-running is safe.
 */
import "dotenv/config";
import mongoose from "mongoose";
import type { Db, MongoClient } from "mongodb";

const APPLY = process.argv.includes("--apply");

type Spec = {
  db: "web" | "erp";
  collection: string;
  name: string;
  keys: Record<string, 1 | -1>;
};

const SPECS: Spec[] = [
  // RetailERP — read-only from the website's point of view; these indexes only speed up reads.
  { db: "erp", collection: "barcodeLabel", name: "groupId_1_status_1", keys: { groupId: 1, status: 1 } },
  { db: "erp", collection: "barcodeLabel", name: "barcodeNo_1_status_1", keys: { barcodeNo: 1, status: 1 } },
  { db: "erp", collection: "ecommerceproduct", name: "productType_1_status_1_isPublished_1", keys: { productType: 1, status: 1, isPublished: 1 } },
  // Website-owned chrome collections (small; these are mostly documentation/consistency).
  { db: "web", collection: "homepageSections", name: "isVisible_1_sortOrder_1", keys: { isVisible: 1, sortOrder: 1 } },
  { db: "web", collection: "banners", name: "placement_1_isActive_1_sortOrder_1", keys: { placement: 1, isActive: 1, sortOrder: 1 } },
  { db: "web", collection: "menuItems", name: "isActive_1_sortOrder_1", keys: { isActive: 1, sortOrder: 1 } },
  { db: "web", collection: "collections", name: "isActive_1_sortOrder_1", keys: { isActive: 1, sortOrder: 1 } },
  { db: "web", collection: "testimonials", name: "isActive_1_sortOrder_1", keys: { isActive: 1, sortOrder: 1 } },
  { db: "web", collection: "cmsPages", name: "isPublished_1_sortOrder_1", keys: { isPublished: 1, sortOrder: 1 } },
];

const uri = (name: "web" | "erp") =>
  name === "web"
    ? process.env.MONGODB_URI ?? process.env.MONGO_URI
    : process.env.ERP_MONGODB_URI ?? process.env.ERP_MONGO_URI ?? process.env.MONGODB_URI ?? process.env.MONGO_URI;
const dbName = (name: "web" | "erp") =>
  name === "web" ? process.env.WEB_DB_NAME ?? "woven_essence_web" : process.env.ERP_DB_NAME ?? "grooretailerp1";

const sameKeys = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  JSON.stringify(a) === JSON.stringify(b);

async function migrate(db: Db, spec: Spec) {
  const collection = db.collection(spec.collection);
  const existing = await collection.indexes();
  const match = existing.find((idx) => sameKeys(idx.key as Record<string, unknown>, spec.keys));
  const label = `${spec.db}.${spec.collection} ${spec.name}`;
  if (match) {
    console.log(`  ok       ${label} (already exists${match.name ? ` as ${match.name}` : ""})`);
    return;
  }
  if (!APPLY) {
    console.log(`  MISSING  ${label}  ${JSON.stringify(spec.keys)}  -> would create`);
    return;
  }
  await collection.createIndex(spec.keys, { name: spec.name });
  console.log(`  CREATED  ${label}`);
}

async function main() {
  const webUri = uri("web");
  if (!webUri) {
    console.error("No MONGODB_URI / MONGO_URI in the environment (copy .env.example to .env).");
    process.exit(1);
  }
  console.log(`mode: ${APPLY ? "APPLY" : "DRY RUN"} (use --apply to create indexes)`);
  const clients: MongoClient[] = [];
  try {
    for (const kind of ["web", "erp"] as const) {
      const conn = await mongoose.createConnection(uri(kind)!, { dbName: dbName(kind), serverSelectionTimeoutMS: 8000 }).asPromise();
      clients.push(conn.getClient());
      console.log(`\n${kind} :: ${dbName(kind)}`);
      for (const spec of SPECS.filter((s) => s.db === kind)) await migrate(conn.db!, spec);
      await conn.close();
    }
  } finally {
    await Promise.all(clients.map((c) => c.close().catch(() => {})));
  }
  console.log(APPLY ? "\nDone. No indexes were dropped." : "\nDry run complete. Nothing was written.");
}

main().catch((error) => {
  console.error("Index migration failed:", String((error as Error)?.message ?? error));
  process.exit(1);
});
