import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const audit = vi.fn();
const findById = vi.fn();
const findByIdAndUpdate = vi.fn();
const deleteOne = vi.fn();
const getResource = vi.fn();

vi.mock("@/lib/auth", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
vi.mock("@/lib/audit", () => ({ audit: (...args: unknown[]) => audit(...args) }));
vi.mock("@/lib/db", () => ({
  getWebConnection: async () => ({}),
  isValidObjectId: (id: string) => /^[a-f\d]{24}$/i.test(id),
}));
vi.mock("@/lib/admin/resources", () => ({ getResource: (...args: unknown[]) => getResource(...args) }));

const { PATCH, DELETE } = await import("@/app/api/v1/admin/[resource]/[id]/route");
const id = "64b000000000000000000001";
const ctx = { params: Promise.resolve({ resource: "roles", id }) } as never;
const request = (body = {}) => ({ json: async () => body }) as never;

describe("role system-role permissions", () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue({ role: "admin", permissions: ["*"] });
    audit.mockReset().mockResolvedValue(undefined);
    findById.mockReset().mockReturnValue({ lean: async () => null });
    findByIdAndUpdate.mockReset().mockReturnValue({ lean: async () => null });
    deleteOne.mockReset().mockResolvedValue({ deletedCount: 1 });
    getResource.mockReset().mockReturnValue({
      write: "users:write",
      update: { safeParse: (data: unknown) => ({ success: true, data }) },
      hidden: [],
      model: () => ({ findById, findByIdAndUpdate, deleteOne }),
    });
  });

  it("allows Administrator to rename Manager and Staff system roles", async () => {
    findById.mockReturnValue({ lean: async () => ({ _id: id, slug: "manager", isSystem: true }) });
    findByIdAndUpdate.mockReturnValue({ lean: async () => ({ _id: id, slug: "store-manager", isSystem: true }) });

    const response = await PATCH(request({ slug: "store-manager" }), ctx);

    expect(response.status).toBe(200);
    expect(findByIdAndUpdate).toHaveBeenCalledWith(id, { $set: { slug: "store-manager" } }, { new: true, runValidators: true });
  });

  it.each([
    ["manager", "staff"],
    ["staff", "manager"],
  ])("blocks %s from changing the %s system role", async (actorRole, targetSlug) => {
    requireAdmin.mockResolvedValue({ role: actorRole, permissions: ["users:write"] });
    findById.mockReturnValue({ lean: async () => ({ _id: id, slug: targetSlug, isSystem: true }) });

    const response = await PATCH(request({ name: "Changed" }), ctx);

    expect(response.status).toBe(403);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("allows Administrator to delete Manager and Staff system roles", async () => {
    findById.mockReturnValue({ lean: async () => ({ _id: id, slug: "staff", isSystem: true }) });

    const response = await DELETE(request(), ctx);

    expect(response.status).toBe(200);
    expect(deleteOne).toHaveBeenCalledWith({ _id: id });
  });

  it("protects the Administrator role from slug changes and deletion", async () => {
    findById.mockReturnValue({ lean: async () => ({ _id: id, slug: "admin", isSystem: true }) });

    const patchResponse = await PATCH(request({ slug: "owner" }), ctx);
    const deleteResponse = await DELETE(request(), ctx);

    expect(patchResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
    expect(deleteOne).not.toHaveBeenCalled();
  });
});