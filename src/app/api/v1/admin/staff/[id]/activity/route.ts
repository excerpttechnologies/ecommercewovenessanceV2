import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireStaffManager } from "@/lib/admin/staff-access";
import { getWebConnection, isValidObjectId } from "@/lib/db";
import { AdminUserModel, AuditLogModel } from "@/models/web/commerce.models";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: NextRequest, ctx: Ctx) => {
  await requireStaffManager();
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("NOT_FOUND", "Staff member not found", 404);
  const conn = await getWebConnection();
  const user = await AdminUserModel(conn).findOne({ _id: id, profile: { $exists: true } }, { email: 1 }).lean();
  if (!user) return fail("NOT_FOUND", "Staff member not found", 404);

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const limit = 50;
  const actorMatch = { $or: [{ actorId: String(user._id) }, { actorEmail: user.email }] };
  const Logs = AuditLogModel(conn);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [entries, total, recent] = await Promise.all([
    Logs.find(actorMatch).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Logs.countDocuments(actorMatch),
    Logs.find({ $and: [actorMatch, { createdAt: { $gte: since } }] }).select("action entity after").lean(),
  ]);

  const counts = { ordersConfirmed: 0, ordersPacked: 0, ordersShipped: 0, enquiriesReplied: 0, productsPublished: 0 };
  for (const entry of recent) {
    const after = entry.after && typeof entry.after === "object" ? entry.after as Record<string, unknown> : {};
    if (entry.entity === "order" && entry.action === "order.update") {
      if (after.status === "Confirmed") counts.ordersConfirmed += 1;
      if (after.status === "Packed") counts.ordersPacked += 1;
      if (after.status === "Shipped") counts.ordersShipped += 1;
    }
    if ((entry.entity === "enquiry" || entry.entity === "enquiries") && (/enquir.*(reply|respond)/i.test(entry.action) || (entry.action === "enquiries.update" && ["in_progress", "closed"].includes(String(after.status))))) counts.enquiriesReplied += 1;
    if (/product/i.test(String(entry.entity)) && (/publish/i.test(entry.action) || after.isPublished === true)) counts.productsPublished += 1;
  }

  return ok({ entries, counts }, { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});