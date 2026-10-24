import type { Connection } from "mongoose";
import { mapStore, STORE_FIELDS as S } from "@/lib/erp-mapping";
import { toObjectIdOrString } from "@/lib/db";
import { StoreModel } from "@/models/erp/store.model";
import type { AnyDoc } from "@/models/_util";
import type { Store } from "@/domain/types";
import type { StoreRepository } from "../types";

export class MongoStoreRepository implements StoreRepository {
  constructor(private readonly conn: () => Promise<Connection>) {}

  async list(): Promise<Store[]> {
    const M = StoreModel(await this.conn());
    const docs = await M.find({}).sort({ [S.name]: 1 }).lean<AnyDoc[]>();
    return docs.map(mapStore);
  }

  async getById(id: string): Promise<Store | null> {
    const M = StoreModel(await this.conn());
    const doc = await M.findOne({ _id: toObjectIdOrString(id) }).lean<AnyDoc>();
    return doc ? mapStore(doc) : null;
  }
}
