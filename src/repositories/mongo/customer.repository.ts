import type { Connection } from "mongoose";
import { CUSTOMER_FIELDS as C, addressToDoc, buildCustomerDoc, mapCustomer } from "@/lib/erp-mapping";
import { toObjectIdOrString } from "@/lib/db";
import { escapeRegex } from "@/lib/utils";
import { CustomerModel } from "@/models/erp/customer.model";
import type { AnyDoc } from "@/models/_util";
import type { Address, Customer, Paginated } from "@/domain/types";
import type { CustomerRepository } from "../types";

/** Website-owned customers stored with RetailERP field names (see erp-mapping.ts). */
export class MongoCustomerRepository implements CustomerRepository {
  constructor(private readonly conn: () => Promise<Connection>) {}
  private async M() {
    return CustomerModel(await this.conn());
  }

  async getById(id: string): Promise<Customer | null> {
    const doc = await (await this.M()).findOne({ _id: toObjectIdOrString(id) }).lean<AnyDoc>();
    return doc ? mapCustomer(doc) : null;
  }

  async getByMobile(mobile: string): Promise<Customer | null> {
    const doc = await (await this.M()).findOne({ [C.mobile]: mobile }).lean<AnyDoc>();
    return doc ? mapCustomer(doc) : null;
  }

  async upsertByMobile(input: { mobile: string; name?: string; email?: string }): Promise<Customer> {
    const M = await this.M();
    const doc = await M.findOneAndUpdate(
      { [C.mobile]: input.mobile },
      {
        $setOnInsert: buildCustomerDoc({
          mobile: input.mobile,
          name: input.name ?? "",
          loyaltyPoints: 0,
          addresses: [],
          createdAt: new Date(),
        }),
        ...(input.name || input.email
          ? { $set: buildCustomerDoc({ name: input.name, email: input.email }) }
          : {}),
      },
      { upsert: true, new: true },
    ).lean<AnyDoc>();
    return mapCustomer(doc);
  }

  async create(input: { name: string; email: string; mobile?: string }): Promise<Customer> {
    const doc = await (await this.M()).create(
      buildCustomerDoc({ ...input, loyaltyPoints: 0, addresses: [], createdAt: new Date() }),
    );
    return mapCustomer(doc.toObject());
  }

  async update(id: string, patch: Partial<Pick<Customer, "name" | "email" | "gstNumber">>): Promise<Customer | null> {
    const doc = await (await this.M())
      .findOneAndUpdate({ _id: toObjectIdOrString(id) }, { $set: buildCustomerDoc(patch) }, { new: true })
      .lean<AnyDoc>();
    return doc ? mapCustomer(doc) : null;
  }

  async setAddresses(id: string, addresses: Address[]): Promise<Customer | null> {
    const doc = await (await this.M())
      .findOneAndUpdate(
        { _id: toObjectIdOrString(id) },
        { $set: { [C.addresses]: addresses.map(addressToDoc) } },
        { new: true },
      )
      .lean<AnyDoc>();
    return doc ? mapCustomer(doc) : null;
  }

  async list(params: { q?: string; page?: number; limit?: number }): Promise<Paginated<Customer>> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const match: AnyDoc = {};
    if (params.q?.trim()) {
      const rx = new RegExp(escapeRegex(params.q.trim()), "i");
      match.$or = [{ [C.name]: rx }, { [C.mobile]: rx }, { [C.email]: rx }];
    }
    const M = await this.M();
    const [docs, total] = await Promise.all([
      M.find(match).sort({ [C.createdAt]: -1 }).skip((page - 1) * limit).limit(limit).lean<AnyDoc[]>(),
      M.countDocuments(match),
    ]);
    return { items: docs.map(mapCustomer), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }
}
