import { beforeEach, describe, expect, it, vi } from "vitest";

const { getErpConnection, findOne, find, sort, toArray } = vi.hoisted(() => ({
  getErpConnection: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  toArray: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getErpConnection }));

const { getErpSettings } = await import("@/lib/admin/erp-settings");

describe("getErpSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getErpConnection.mockResolvedValue({
      name: "grooretailerp1",
      db: {
        collection: (name: string) => {
          if (name === "sitesettings") return { findOne };
          if (name === "storefrontSettings") return { findOne };
          if (name === "branches") return { find, sort, toArray };
          throw new Error(`Unexpected collection: ${name}`);
        },
      },
    });
    findOne.mockImplementation((query) => query.key === "default"
      ? Promise.resolve({
          brand: { name: "Woven Essence", tagline: "" },
          contact: { phone: "", email: "hello@example.com", address: "", hours: "" },
          shipping: { freeShippingThreshold: 5000, standardCharge: 100, codAvailable: true, codCharge: 50 },
          returns: { window: "7 days", policy: "Unused items only" },
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        })
      : Promise.resolve({
          shipping: { flatRate: 100, estimatedDays: "3-5 days" },
          cod: { enabled: false, fee: 0 },
          onlinePaymentEnabled: true,
          guestCheckout: true,
          lowStockThreshold: 2,
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        }));
    find.mockReturnValue({ sort });
    sort.mockReturnValue({ toArray });
    toArray.mockResolvedValue([
      { _id: "branch-1", branchName: "Temple Fabrics", branchCode: "TF-1", status: "active" },
    ]);
  });

  it("reads live ERP settings and only returns active branch options", async () => {
    const result = await getErpSettings();

    expect(findOne).toHaveBeenCalledWith({ key: "default" });
    expect(findOne).toHaveBeenCalledWith(
      { key: "storefront" },
      { sort: { updatedAt: -1 } },
    );
    expect(find).toHaveBeenCalledWith(
      { status: "active", isDeleted: { $ne: true } },
      { projection: { branchName: 1, branchCode: 1, status: 1 } },
    );
    expect(result).toMatchObject({
      dbName: "grooretailerp1",
      brand: { name: "Woven Essence", tagline: null },
      contact: { email: "hello@example.com" },
      siteCommerce: {
        freeShippingThreshold: 5000,
        codAvailable: true,
        shippingCharge: 100,
        codCharge: 50,
      },
      storefront: {
        freeShippingThreshold: null,
        shippingCharge: 100,
        estimatedDays: "3-5 days",
        codEnabled: false,
        codFee: 0,
        onlinePaymentEnabled: true,
        guestCheckout: true,
        lowStockThreshold: 2,
      },
      branches: [{ id: "branch-1", name: "Temple Fabrics", code: "TF-1", status: "active" }],
      siteSettingsUpdatedAt: "2026-01-01T00:00:00.000Z",
      storefrontSettingsUpdatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(result.fetchedAt).toBeTruthy();
  });

  it("returns null for ERP fields that are not configured", async () => {
    findOne.mockResolvedValue(null);
    toArray.mockResolvedValue([]);

    const result = await getErpSettings();

    expect(result.brand.name).toBeNull();
    expect(result.contact.email).toBeNull();
    expect(result.siteCommerce.codAvailable).toBeNull();
    expect(result.branches).toEqual([]);
    expect(result.siteSettingsUpdatedAt).toBeNull();
    expect(result.storefrontSettingsUpdatedAt).toBeNull();
  });

  it("reports a missing ERP database instead of returning defaults", async () => {
    getErpConnection.mockResolvedValue({ name: "grooretailerp1", db: null });

    await expect(getErpSettings()).rejects.toThrow("RetailERP database connection is not ready");
  });
});
