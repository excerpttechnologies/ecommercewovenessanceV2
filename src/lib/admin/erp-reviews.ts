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
  page,
  limit,
}: {
  search: string;
  page: number;
  limit: number;
}): Promise<{ summary: ErpReviewSummary; items: ErpReviewedProduct[]; total: number; page: number; limit: number; pages: number }> {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  // The ERP schema (item, barcodeLabel, ecommerceproduct, …) has no reviews
  // fields — product reviews live in the web DB's ReviewModel. There is no ERP
  // collection to aggregate, so this reports an empty result instead of querying
  // a nonexistent `items` collection.
  const summary: ErpReviewSummary = {
    totalItems: 0,
    reviewsEnabledItems: 0,
    productsWithReviews: 0,
    totalReviews: 0,
    verifiedPurchaseReviews: 0,
    averageRating: 0,
  };

  return {
    summary,
    items: [],
    total: 0,
    page: normalizedPage,
    limit: normalizedLimit,
    pages: 0,
  };
}
