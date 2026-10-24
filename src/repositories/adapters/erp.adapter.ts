import { getMasterConnection } from "@/lib/db";
import { env } from "@/lib/env";
import { ERP_COLLECTIONS } from "@/lib/erp-mapping";
import { MongoCategoryRepository } from "../mongo/category.repository";
import { MongoProductRepository } from "../mongo/product.repository";
import { MongoStoreRepository } from "../mongo/store.repository";
import type { MasterDataSource } from "../types";

/**
 * MongoERPAdapter — reads products / categories / stores straight from the
 * RetailERP MongoDB (ERP_MONGODB_URI + ERP_DB_NAME). Read-only: every schema
 * has a readOnlyGuard, and this adapter exposes no write methods.
 */
export function createErpAdapter(): MasterDataSource {
  const conn = getMasterConnection;
  const categories = new MongoCategoryRepository(conn);
  const products = new MongoProductRepository(conn, "erp", categories);
  const stores = new MongoStoreRepository(conn);
  return {
    kind: "erp",
    readOnly: true,
    products,
    categories,
    stores,
    async ping() {
      const t = Date.now();
      try {
        const c = await conn();
        const existing = new Set((await c.db!.listCollections().toArray()).map((x) => x.name));
        const collections: Record<string, number> = {};
        for (const name of Object.values(ERP_COLLECTIONS)) {
          collections[name] = existing.has(name) ? await c.db!.collection(name).estimatedDocumentCount() : -1; // -1 = missing
        }
        return { ok: true, dbName: env.ERP_DB_NAME, collections, ms: Date.now() - t };
      } catch (e) {
        return { ok: false, error: (e as Error).message, ms: Date.now() - t };
      }
    },
  };
}
