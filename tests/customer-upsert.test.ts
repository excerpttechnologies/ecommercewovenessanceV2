import { describe, expect, it, vi } from "vitest";

const findOneAndUpdate = vi.fn();
vi.mock("@/models/erp/customer.model", () => ({ CustomerModel: () => ({ findOneAndUpdate }) }));
vi.mock("@/lib/db", () => ({ toObjectIdOrString: (id: string) => id }));

const { MongoCustomerRepository } = await import("@/repositories/mongo/customer.repository");

describe("MongoCustomerRepository.upsertByMobile", () => {
  it("never names a path in both $set and $setOnInsert (MongoDB rejects that as a conflict)", async () => {
    findOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: "c1", mobile: "9876543210", customerName: "Asha", addresses: [] }) });
    const repo = new MongoCustomerRepository(async () => ({}) as never);

    await repo.upsertByMobile({ mobile: "9876543210", name: "Asha", email: "asha@example.com" });

    const [, update] = findOneAndUpdate.mock.calls[0];
    const setKeys = Object.keys(update.$set ?? {});
    const insertKeys = Object.keys(update.$setOnInsert ?? {});
    expect(setKeys).toEqual(expect.arrayContaining(["customerName", "email"]));
    expect(insertKeys.filter((k) => setKeys.includes(k))).toEqual([]);
    expect(insertKeys).toEqual(expect.arrayContaining(["mobile", "loyaltyPoints", "addresses"]));
  });

  it("keeps the insert-time name when no name or email is given", async () => {
    findOneAndUpdate.mockClear();
    const repo = new MongoCustomerRepository(async () => ({}) as never);
    await repo.upsertByMobile({ mobile: "9876543210" });
    const [, update] = findOneAndUpdate.mock.calls[0];
    expect(update.$set).toBeUndefined();
    expect(update.$setOnInsert.customerName).toBe("");
  });
});
