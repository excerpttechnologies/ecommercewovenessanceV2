import { getErpConnection } from "@/lib/db";
import { escapeRegex } from "@/lib/utils";

export interface ErpReviewSummary {
  totalItems: number;
  reviewsEnabledItems: number;
  productsWithReviews: number;
  totalReviews: number;
  verifiedPurchaseReviews: number;
  averageRating: number;
}

export interface ErpReviewedProduct {
  _id: string;
  itemCode: string;
  productName: string;
  averageRating: number;
  totalReviews: number;
  verifiedPurchaseReviews: number;
}

export async function getErpReviewSummary({
  search,
  page,
  limit,
}: {
  search: string;
  page: number;
  limit: number;
}): Promise<{ summary: ErpReviewSummary; items: ErpReviewedProduct[]; total: number; page: number; limit: number; pages: number }> {
  const connection = await getErpConnection();
  if (!connection.db) throw new Error("RetailERP database connection is not ready");

  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const match: Record<string, unknown> = { "reviews.totalReviews": { $gt: 0 } };
  const query = search.trim().slice(0, 100);
  if (query) {
    const expression = { $regex: escapeRegex(query), $options: "i" };
    match.$or = [
      { "identity.itemCode": expression },
      { "identity.productName": expression },
    ];
  }

  const numberValue = (path: string) => ({
    $convert: {
      input: { $ifNull: [path, 0] },
      to: "double",
      onError: 0,
      onNull: 0,
    },
  });

  const [result] = await connection.db.collection("items").aggregate<{
    summary?: ErpReviewSummary[];
    items?: ErpReviewedProduct[];
    total?: { value: number }[];
  }>([
    {
      $facet: {
        summary: [
          {
            $project: {
              reviewsEnabled: { $eq: ["$reviews.reviewsEnabled", true] },
              totalReviews: numberValue("$reviews.totalReviews"),
              verifiedPurchaseReviews: numberValue("$reviews.verifiedPurchaseReviews"),
              averageRating: numberValue("$reviews.averageRating"),
            },
          },
          {
            $group: {
              _id: null,
              totalItems: { $sum: 1 },
              reviewsEnabledItems: { $sum: { $cond: ["$reviewsEnabled", 1, 0] } },
              productsWithReviews: { $sum: { $cond: [{ $gt: ["$totalReviews", 0] }, 1, 0] } },
              totalReviews: { $sum: "$totalReviews" },
              verifiedPurchaseReviews: { $sum: "$verifiedPurchaseReviews" },
              ratingTotal: { $sum: { $multiply: ["$averageRating", "$totalReviews"] } },
            },
          },
          {
            $project: {
              _id: 0,
              totalItems: 1,
              reviewsEnabledItems: 1,
              productsWithReviews: 1,
              totalReviews: 1,
              verifiedPurchaseReviews: 1,
              averageRating: {
                $cond: [
                  { $gt: ["$totalReviews", 0] },
                  { $divide: ["$ratingTotal", "$totalReviews"] },
                  0,
                ],
              },
            },
          },
        ],
        items: [
          { $match: match },
          { $sort: { "reviews.totalReviews": -1, "identity.itemCode": 1 } },
          { $skip: (normalizedPage - 1) * normalizedLimit },
          { $limit: normalizedLimit },
          {
            $project: {
              _id: { $toString: "$_id" },
              itemCode: { $ifNull: ["$identity.itemCode", ""] },
              productName: { $ifNull: ["$identity.productName", ""] },
              averageRating: numberValue("$reviews.averageRating"),
              totalReviews: numberValue("$reviews.totalReviews"),
              verifiedPurchaseReviews: numberValue("$reviews.verifiedPurchaseReviews"),
            },
          },
        ],
        total: [{ $match: match }, { $count: "value" }],
      },
    },
  ]).toArray();

  const summary = result?.summary?.[0] ?? {
    totalItems: 0,
    reviewsEnabledItems: 0,
    productsWithReviews: 0,
    totalReviews: 0,
    verifiedPurchaseReviews: 0,
    averageRating: 0,
  };
  const total = result?.total?.[0]?.value ?? 0;

  return {
    summary,
    items: result?.items ?? [],
    total,
    page: normalizedPage,
    limit: normalizedLimit,
    pages: Math.ceil(total / normalizedLimit),
  };
}
