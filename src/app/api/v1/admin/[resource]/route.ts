/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { fail, handler, ok } from "@/lib/api/response";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { getResource } from "@/lib/admin/resources";
import { escapeRegex } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RESERVED = new Set(["settings", "dashboard", "products", "orders", "customers", "erp", "inventory", "reports", "audit", "auth"]);

function projection(hidden?: string[]) {
  return Object.fromEntries((hidden ?? []).map((h) => [h, 0]));
}

/** GET /api/v1/admin/:resource?q=&page=&limit=&sort=field:-1&filter[status]=pending */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ resource: string }> }) => {
  const { resource } = await ctx.params;
  if (RESERVED.has(resource)) return fail("NOT_FOUND", "Unknown resource", 404);
  const def = getResource(resource);
  await requireAdmin(def.read);
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? 50)));
  const match: any = {};
  const q = sp.get("q")?.trim();
  if (q) match.$or = def.search.map((f) => ({ [f]: { $regex: escapeRegex(q), $options: "i" } }));
  for (const [k, v] of sp.entries()) {
    const m = /^filter\[(\w+)\]$/.exec(k);
    if (!m || v === "") continue;
    if (resource === "coupons" && m[1] === "status") {
      const now = new Date();
      if (v === "active") {
        match.isActive = true;
        match.$and = [{ $or: [{ validFrom: null }, { validFrom: { $exists: false } }, { validFrom: { $lte: now } }] }, { $or: [{ validTo: null }, { validTo: { $exists: false } }, { validTo: { $gte: now } }] }];
      } else if (v === "expired") match.validTo = { $lt: now };
      else if (v === "inactive") match.isActive = false;
      else if (v === "scheduled") match.validFrom = { $gt: now };
      else if (v === "advertised") match.isAdvertised = true;
      else if (v === "redeemed") match.usedCount = { $gt: 0 };
      continue;
    }
    match[m[1]] = v === "true" ? true : v === "false" ? false : v;
  }
  let sort = def.sort;
  const s = sp.get("sort");
  if (s) {
    const [f, d] = s.split(":");
    sort = { [f]: d === "-1" ? -1 : 1 };
  }
  const M = def.model(await getWebConnection());
  const [items, total] = await Promise.all([M.find(match, projection(def.hidden)).sort(sort).skip((page - 1) * limit).limit(limit).lean(), M.countDocuments(match)]);
  return ok(items, { total, page, limit, pages: Math.ceil(total / limit) });
});

/** POST /api/v1/admin/:resource */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ resource: string }> }) => {
  const { resource } = await ctx.params;
  if (RESERVED.has(resource)) return fail("NOT_FOUND", "Unknown resource", 404);
  const def = getResource(resource);
  const actor = await requireAdmin(def.write);
  const parsed = def.create.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid body", 422, parsed.error.flatten());
  const data: any = { ...parsed.data };
  if (resource === "users") {
    if (!data.password) return fail("VALIDATION_ERROR", "Password is required", 422);
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  const M = def.model(await getWebConnection());
  const doc = (await M.create(data)).toObject();
  for (const h of def.hidden ?? []) delete doc[h];
  await audit(actor, `${resource}.create`, resource, doc._id, undefined, doc, req);
  return ok(doc, undefined, { status: 201 });
});
