import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, getErpSettings } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getErpSettings: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/lib/admin/erp-settings", () => ({ getErpSettings }));

const { GET } = await import("@/app/api/v1/admin/erp/settings/route");

describe("GET /api/v1/admin/erp/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ id: "admin-1" });
    getErpSettings.mockResolvedValue({ dbName: "grooretailerp1", branches: [] });
  });

  it("returns live ERP settings to admins", async () => {
    const response = await GET();

    expect(requireAdmin).toHaveBeenCalledWith("settings:write");
    expect(getErpSettings).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { dbName: "grooretailerp1", branches: [] },
    });
  });

  it("does not read ERP settings when admin authorization fails", async () => {
    requireAdmin.mockRejectedValue(Object.assign(new Error("Admin login required"), {
      status: 401,
      code: "UNAUTHENTICATED",
    }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getErpSettings).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
