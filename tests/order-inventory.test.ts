import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ getErpConnection: vi.fn(), getWebConnection: vi.fn() }));

const { allocateAcrossLabels, financialYear } = await import("@/lib/inventory/order-inventory");

type LabelInput = {
  id: string;
  barcode: string;
  itemCode?: string;
  uom?: string;
  unitsOnHand: number;
  committed: number;
};

const label = (overrides: Partial<LabelInput> = {}) => ({
  id: overrides.id ?? "label-1",
  barcode: overrides.barcode ?? "8900001",
  itemCode: overrides.itemCode ?? "SKU-1",
  uom: overrides.uom,
  unitsOnHand: overrides.unitsOnHand ?? 1,
  committed: overrides.committed ?? 0,
});

describe("allocateAcrossLabels", () => {
  it("takes one physical piece per unit for unique barcode labels", () => {
    const labels = [
      label({ id: "a", barcode: "1001" }),
      label({ id: "b", barcode: "1002" }),
      label({ id: "c", barcode: "1003" }),
    ];

    const { allocations, shortfall } = allocateAcrossLabels(labels, 2);

    expect(shortfall).toBe(0);
    expect(allocations).toHaveLength(2);
    expect(allocations.every((allocation) => allocation.qty === 1)).toBe(true);
  });

  it("never allocates a label that website orders already hold", () => {
    const labels = [label({ id: "a", unitsOnHand: 1, committed: 1 })];

    const { allocations, shortfall } = allocateAcrossLabels(labels, 1);

    expect(allocations).toHaveLength(0);
    expect(shortfall).toBe(1);
  });

  it("drains a batch label and splits across several labels of the same product", () => {
    const labels = [
      label({ id: "roll-a", barcode: "2001", unitsOnHand: 5 }),
      label({ id: "roll-b", barcode: "2002", unitsOnHand: 5 }),
    ];

    const { allocations, shortfall } = allocateAcrossLabels(labels, 7);

    expect(shortfall).toBe(0);
    expect(allocations).toEqual([
      { label: expect.objectContaining({ id: "roll-a" }), qty: 5 },
      { label: expect.objectContaining({ id: "roll-b" }), qty: 2 },
    ]);
  });

  it("reports the exact shortfall when physical stock runs out", () => {
    const labels = [label({ id: "a", unitsOnHand: 1 }), label({ id: "b", unitsOnHand: 1, committed: 1 })];

    const { allocations, shortfall } = allocateAcrossLabels(labels, 3);

    expect(allocations).toHaveLength(1);
    expect(shortfall).toBe(2);
  });

  it("handles fractional units of measurement without float noise", () => {
    const labels = [label({ id: "mtr", uom: "MTR", unitsOnHand: 0.5, committed: 0 })];

    const { allocations, shortfall } = allocateAcrossLabels(labels, 0.5);

    expect(shortfall).toBe(0);
    expect(allocations[0].qty).toBe(0.5);
  });

  it("allocates nothing for a non-positive request", () => {
    const labels = [label()];
    expect(allocateAcrossLabels(labels, 0)).toEqual({ allocations: [], shortfall: 0 });
    expect(allocateAcrossLabels(labels, -2)).toEqual({ allocations: [], shortfall: 0 });
  });
});

describe("financialYear", () => {
  it("starts the Indian financial year in April", () => {
    expect(financialYear(new Date("2026-04-01T00:00:00Z"))).toBe("2026-2027");
    expect(financialYear(new Date("2026-03-31T00:00:00Z"))).toBe("2025-2026");
    expect(financialYear(new Date("2026-11-07T00:00:00Z"))).toBe("2026-2027");
  });
});
