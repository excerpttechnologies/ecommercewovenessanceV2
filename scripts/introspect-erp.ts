/**
 * npm run erp:introspect -- "<mongodb uri>" [dbName] [--examples]
 *
 * Connects to a MongoDB database, lists every collection, samples up to 300
 * documents per collection and prints the union of field paths with their
 * observed types and coverage. Writes erp-introspection.json next to package.json.
 *
 * Paste that file back and the placeholders in src/lib/erp-mapping.ts get
 * replaced with the real RetailERP names.
 *
 * Nothing is written to the database. Example values are OFF unless --examples
 * is passed, and fields that look like personal data are never sampled.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import mongoose from "mongoose";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const uri = args[0] ?? process.env.ERP_MONGODB_URI ?? process.env.MONGODB_URI;
const dbName = args[1] ?? process.env.ERP_DB_NAME;
const withExamples = flags.has("--examples");
const SAMPLE = 300;
const PII = /mobile|phone|email|password|otp|token|aadhaar|pan|gst|address|secret/i;

if (!uri) {
  console.error('Usage: npm run erp:introspect -- "<mongodb uri>" [dbName] [--examples]');
  process.exit(1);
}

type FieldInfo = { types: Set<string>; seen: number; examples: unknown[] };

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (v instanceof Date) return "date";
  if (v instanceof mongoose.Types.ObjectId) return "objectId";
  if (typeof v === "object" && v && (v as { _bsontype?: string })._bsontype)
    return String((v as { _bsontype?: string })._bsontype).toLowerCase();
  return typeof v;
}

function walk(value: unknown, prefix: string, out: Record<string, FieldInfo>, depth: number) {
  if (depth > 3 || value === null || typeof value !== "object" || value instanceof Date) return;
  if (value instanceof mongoose.Types.ObjectId) return;
  if (Array.isArray(value)) {
    // record the element shape once under "path[]"
    const first = value.find((x) => x !== null && x !== undefined);
    if (first !== undefined) {
      const p = `${prefix}[]`;
      const info = (out[p] ??= { types: new Set(), seen: 0, examples: [] });
      info.types.add(typeOf(first));
      info.seen += 1;
      if (typeof first === "object") walk(first, p, out, depth + 1);
      else if (withExamples && !PII.test(p) && info.examples.length < 3) info.examples.push(String(first).slice(0, 40));
    }
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k;
    const info = (out[p] ??= { types: new Set(), seen: 0, examples: [] });
    info.types.add(typeOf(v));
    info.seen += 1;
    if (withExamples && !PII.test(p) && info.examples.length < 3 && (typeof v !== "object" || v instanceof Date))
      info.examples.push(v instanceof Date ? v.toISOString() : String(v).slice(0, 40));
    if (v && typeof v === "object") walk(v, p, out, depth + 1);
  }
}

async function main() {
  const t0 = Date.now();
  const conn = await mongoose.createConnection(uri!, { dbName, serverSelectionTimeoutMS: 20_000 }).asPromise();
  const db = conn.db!;
  console.log(`Connected to "${db.databaseName}" in ${Date.now() - t0} ms`);
  const names = (await db.listCollections().toArray()).map((c) => c.name).sort();

  const report: Record<string, unknown> = {};
  const hints: string[] = [];

  for (const name of names) {
    const col = db.collection(name);
    const count = await col.estimatedDocumentCount();
    const sample = await col.find({}).limit(SAMPLE).toArray();
    const fields: Record<string, FieldInfo> = {};
    for (const doc of sample) walk(doc, "", fields, 0);
    const fieldNames = Object.keys(fields);
    const lc = fieldNames.map((f) => f.toLowerCase());
    const looksLike =
      lc.some((f) => /sku|barcode|hsn/.test(f)) && lc.some((f) => /price|mrp|rate/.test(f))
        ? "products"
        : lc.some((f) => /categoryname|parentid|parent_id/.test(f))
          ? "categories"
          : lc.some((f) => /orderno|order_no|invoiceno|billno/.test(f))
            ? "orders"
            : lc.some((f) => /customername|mobile|phone/.test(f)) && !lc.some((f) => /orderno/.test(f))
              ? "customers"
              : lc.some((f) => /storename|branch|outlet/.test(f))
                ? "stores"
                : undefined;
    if (looksLike) hints.push(`${name} → looks like "${looksLike}" (${count} docs)`);

    report[name] = {
      count,
      sampled: sample.length,
      looksLike,
      fields: Object.fromEntries(
        Object.entries(fields)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [
            k,
            {
              types: Array.from(v.types),
              coverage: sample.length ? Number((v.seen / sample.length).toFixed(2)) : 0,
              ...(withExamples ? { examples: v.examples } : {}),
            },
          ]),
      ),
    };
    console.log(`  ${name.padEnd(32)} ${String(count).padStart(7)} docs  ${fieldNames.length} fields${looksLike ? `  ⇒ ${looksLike}` : ""}`);
  }

  writeFileSync("erp-introspection.json", JSON.stringify({ db: db.databaseName, generatedAt: new Date().toISOString(), hints, collections: report }, null, 2));
  console.log(`\nWrote erp-introspection.json (${names.length} collections).`);
  if (hints.length) console.log("Guesses:\n  " + hints.join("\n  "));
  await conn.close();
}

main().catch((e) => {
  console.error("Introspection failed:", e.message);
  process.exit(1);
});
