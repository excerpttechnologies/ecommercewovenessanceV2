import { handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { CouponModel } from "@/models/web/commerce.models";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdmin("marketing:write");
  const coupons = CouponModel(await getWebConnection());
  const now = new Date();
  const [all, active, expired, inactive, scheduled, advertised, redeemed, redemptions] = await Promise.all([
    coupons.countDocuments({}),
    coupons.countDocuments({
      isActive: true,
      $and: [
        { $or: [{ validFrom: null }, { validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
        { $or: [{ validTo: null }, { validTo: { $exists: false } }, { validTo: { $gte: now } }] },
      ],
    }),
    coupons.countDocuments({ validTo: { $lt: now } }),
    coupons.countDocuments({ isActive: false }),
    coupons.countDocuments({ validFrom: { $gt: now } }),
    coupons.countDocuments({ isAdvertised: true }),
    coupons.countDocuments({ usedCount: { $gt: 0 } }),
    coupons.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ["$usedCount", 0] } } } }]),
  ]);
  return ok({ all, active, expired, inactive, scheduled, advertised, redeemed, timesRedeemed: redemptions[0]?.total ?? 0 });
});
