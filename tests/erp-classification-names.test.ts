import { describe, expect, it, vi } from "vitest";
import type { Connection } from "mongoose";
import { loadClassificationNames } from "@/lib/erp-classification-names";

describe("loadClassificationNames", () => {
  it("resolves legacy productclassificationoption IDs when per-classification collections have no match", async () => {
    const id = "64a000000000000000000001";
    const collection = vi.fn((name: string) => ({
      find: () => ({
        toArray: async () => name === "productclassificationoption" ? [{ _id: { toString: () => id }, name: "Brocade" }] : [],
      }),
    }));
    const connection = { db: { collection } } as unknown as Connection;

    await expect(loadClassificationNames(connection, [id])).resolves.toEqual(new Map([[id, "Brocade"]]));
    expect(collection).toHaveBeenCalledWith("productclassificationoption");
  });

  it("does not replace a current per-classification name with a legacy value", async () => {
    const id = "64a000000000000000000002";
    const collection = vi.fn((name: string) => ({
      find: () => ({
        toArray: async () => name === "byweave"
          ? [{ _id: { toString: () => id }, name: "Updated Weave" }]
          : name === "productclassificationoption"
            ? [{ _id: { toString: () => id }, name: "Old Weave" }]
            : [],
      }),
    }));
    const connection = { db: { collection } } as unknown as Connection;

    await expect(loadClassificationNames(connection, [id])).resolves.toEqual(new Map([[id, "Updated Weave"]]));
    expect(collection).not.toHaveBeenCalledWith("productclassificationoption");
  });
});
