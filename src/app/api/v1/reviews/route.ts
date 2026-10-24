import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { getCustomerSession } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { ReviewModel } from "@/models/web/commerce.models";
import { OrderModel } from "@/models/erp/order.model";
import { ORDER_FIELDS, ORDER_ITEM_FIELDS } from "@/lib/erp-mapping";

export const dynamic = "force-dynamic";

/** GET /api/v1/reviews?sku=… — approved reviews + rating summary */
export const GET = handler(async (req: NextRequest) => {
  const sku = req.nextUrl.searchParams.get("sku");
  if (!sku) return fail("VALIDATION_ERROR", "sku is required");
  const M = ReviewModel(await getWebConnection());
  const docs = await M.find({ sku, status: "approved" }).sort({ createdAt: -1 }).limit(50).lean();
  const count = docs.length;
  const avg = count ? docs.reduce((s, d) => s + d.rating, 0) / count : 0;
  return ok({
    items: docs.map((d) => ({ id: String(d._id), customerName: d.customerName, rating: d.rating, title: d.title, body: d.body, createdAt: d.createdAt, isVerifiedPurchase: d.isVerifiedPurchase })),
    avg,
    count,
  });
});

/** POST /api/v1/reviews — submit (pending moderation) */
export const POST = handler(async (req: NextRequest) => {
  const b = await parseBody(req, z.object({ sku: z.string().min(1), customerName: z.string().min(2).max(80), rating: z.number().int().min(1).max(5), title: z.string().max(120).optional(), body: z.string().min(10).max(2000) }));
  if (!b.ok) return b.res;
  const session = await getCustomerSession();
  const conn = await getWebConnection();
  let verified = false;
  if (session) {
    const O = OrderModel(conn);
    verified = !!(await O.exists({ [ORDER_FIELDS.customerId]: session.sub, [`${ORDER_FIELDS.items}.${ORDER_ITEM_FIELDS.sku}`]: b.data.sku }));
  }
  const doc = await ReviewModel(conn).create({ ...b.data, customerId: session?.sub, isVerifiedPurchase: verified, status: "pending" });
  return ok({ id: String(doc._id), status: "pending" }, undefined, { status: 201 });
});
