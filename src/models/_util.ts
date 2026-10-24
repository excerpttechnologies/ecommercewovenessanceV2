/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, type Connection, type Model, type SchemaDefinition } from "mongoose";
import { env } from "@/lib/env";

export type AnyDoc = Record<string, any>;

/** Register a model on a specific connection, once. */
export function getModel<T = AnyDoc>(conn: Connection, name: string, schema: Schema<any>): Model<T> {
  // NOTE: deliberately NOT `conn.model<T>(...)` — mongoose 8's generic overload
  // makes tsc explode (multi-GB type instantiation). Cast instead.
  return (conn.models[name] ?? conn.model(name, schema)) as unknown as Model<T>;
}

/**
 * Turns { "pricing.mrp": Number } into { pricing: { mrp: Number } } so dotted
 * ERP paths declared in erp-mapping.ts produce valid Mongoose schemas.
 */
export function defineFromMapping(flat: Record<string, any>): SchemaDefinition {
  const out: Record<string, any> = {};
  for (const [path, def] of Object.entries(flat)) {
    if (path === "_id") continue;
    const keys = path.split(".");
    let cur = out;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        cur[k] = def;
      } else {
        if (!cur[k] || typeof cur[k] !== "object" || cur[k].type) cur[k] = {};
        cur = cur[k];
      }
    });
  }
  return out;
}

const READ_ONLY_MSG = "RetailERP master data is read-only from the website (DATA_SOURCE=erp). Write blocked.";

/**
 * Blocks every write on ERP master collections when the site is pointed at RetailERP.
 * `always` blocks writes regardless of DATA_SOURCE (for collections only ever read from the ERP database).
 */
export function readOnlyGuard(schema: Schema, always = false) {
  const blocked = () => always || env.DATA_SOURCE === "erp";
  const block = function (this: unknown, next: (err?: Error) => void) {
    if (blocked()) return next(new Error(READ_ONLY_MSG));
    next();
  };
  schema.pre("save", block);
  schema.pre(
    ["updateOne", "updateMany", "deleteOne", "deleteMany", "findOneAndUpdate", "findOneAndDelete", "replaceOne"],
    block,
  );
  schema.pre("insertMany", function (next: (err?: Error) => void) {
    if (blocked()) return next(new Error(READ_ONLY_MSG));
    next();
  });
}
