import { describe, expect, it } from "vitest";
import { mergeDashboardOrders } from "@/lib/admin/stats";
import type { ErpDashboardOrders } from "@/repositories/mongo/erp-order.repository";

const empty = (): ErpDashboardOrders => ({
  today: { orders: 0, revenue: 0 },
  last30: { orders: 0, revenue: 0, aov: 0 },
  statusCounts: {},
  series: [],
  topSkus: [],
  latestOrders: [],
  outForDelivery: [],
});

describe("mergeDashboardOrders", () => {
  it("adds website and RetailERP figures and merges per-day and per-SKU rows", () => {
    const web: ErpDashboardOrders = {
      ...empty(),
      today: { orders: 2, revenue: 1000 },
      last30: { orders: 3, revenue: 1500, aov: 500 },
      statusCounts: { Placed: 2 },
      series: [{ date: "2026-11-07", orders: 2, revenue: 1000 }],
      topSkus: [{ sku: "A", name: "Alpha", qty: 2, revenue: 1000 }],
    };
    const erp: ErpDashboardOrders = {
      ...empty(),
      today: { orders: 1, revenue: 500 },
      last30: { orders: 1, revenue: 500, aov: 500 },
      statusCounts: { Placed: 1, Shipped: 1 },
      series: [{ date: "2026-11-07", orders: 1, revenue: 500 }],
      topSkus: [
        { sku: "A", name: "Alpha", qty: 1, revenue: 500 },
        { sku: "B", name: "Beta", qty: 1, revenue: 200 },
      ],
    };

    const merged = mergeDashboardOrders(web, erp);

    expect(merged.today).toEqual({ orders: 3, revenue: 1500 });
    expect(merged.last30).toEqual({ orders: 4, revenue: 2000, aov: 500 });
    expect(merged.statusCounts).toEqual({ Placed: 3, Shipped: 1 });
    expect(merged.series).toEqual([{ date: "2026-11-07", orders: 3, revenue: 1500 }]);
    expect(merged.topSkus).toEqual([
      { sku: "A", name: "Alpha", qty: 3, revenue: 1500 },
      { sku: "B", name: "Beta", qty: 1, revenue: 200 },
    ]);
    expect(merged.latestOrders).toEqual([]);
  });

  it("still returns the surviving source when the other failed to load", () => {
    const erp: ErpDashboardOrders = { ...empty(), today: { orders: 1, revenue: 500 } };

    expect(mergeDashboardOrders(null, erp).today).toEqual({ orders: 1, revenue: 500 });
  });

  it("recomputes AOV from the merged totals", () => {
    const web: ErpDashboardOrders = { ...empty(), last30: { orders: 1, revenue: 999, aov: 999 } };
    const erp: ErpDashboardOrders = { ...empty(), last30: { orders: 2, revenue: 501, aov: 250 } };

    expect(mergeDashboardOrders(web, erp).last30).toEqual({ orders: 3, revenue: 1500, aov: 500 });
  });
});
