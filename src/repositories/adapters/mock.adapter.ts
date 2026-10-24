import { getWebConnection } from "@/lib/db";
import { env } from "@/lib/env";
import { ERP_COLLECTIONS } from "@/lib/erp-mapping";
import { MongoCategoryRepository } from "../mongo/category.repository";
import { MongoProductRepository } from "../mongo/product.repository";
import { MongoStoreRepository } from "../mongo/store.repository";
import type { MasterDataSource } from "../types";

/**
 * MockAdapter — master data lives in the website's own MongoDB (WEB_DB_NAME),
 * populated by `npm run seed` using the SAME schemas and field names as the ERP.
 * Because everything passes through erp-mapping.ts, swapping to the ERP adapter
 * changes no UI code.
 */
export function createMockAdapter(): MasterDataSource {
  const conn = getWebConnection;
  const categories = new MongoCategoryRepository(conn);
  const products = new MongoProductRepository(conn, "mock", categories);
  const stores = new MongoStoreRepository(conn);
  return {
    kind: "mock",
    readOnly: false,
    products,
    categories,
    stores,
    async ping() {
      const t = Date.now();
      try {
        const c = await conn();
        const collections: Record<string, number> = {};
        for (const name of Object.values(ERP_COLLECTIONS)) {
          collections[name] = await c.db!.collection(name).estimatedDocumentCount();
        }
        return { ok: true, dbName: env.WEB_DB_NAME, collections, ms: Date.now() - t };
      } catch (e) {
        return { ok: false, error: (e as Error).message, ms: Date.now() - t };
      }
    },
  };
}
