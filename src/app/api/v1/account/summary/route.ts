// // FILE: src/app/api/v1/account/summary/route.ts   (NEW FILE)
// // ADDED: GET handler - returns { loggedIn, customer, wishlist[], orders[], orderTotal } using existing getCustomerSession, getWishlistSkus, getCustomers, getOrders, getMasterData, getBarcodeLabels.
// import { handler, ok } from "@/lib/api/response";
// import { getCustomerSession } from "@/lib/auth";
// import { getWishlistSkus } from "@/lib/cart-server";
// import { barcodeProductToProduct } from "@/lib/erp-mapping";
// import { getBarcodeLabels, getCustomers, getMasterData, getOrders } from "@/repositories";

// export const dynamic = "force-dynamic";

// /** GET /api/v1/account/summary — one fast call that fills the navbar: profile, liked products, recent orders. */
// export const GET = handler(async () => {
//   const s = await getCustomerSession();
//   const skus = await getWishlistSkus();

//   const [customer, orders, products] = await Promise.all([
//     s ? getCustomers().getById(s.sub) : null,
//     s ? getOrders().listByCustomer(s.sub, { limit: 5 }) : null,
//     skus.length ? getMasterData().products.getBySkus(skus) : [],
//   ]);
//   const found = new Set(products.map((p) => p.sku));
//   const missing = skus.filter((k) => !found.has(k));
//   const barcodeItems = missing.length ? await getBarcodeLabels().getByBarcodes(missing) : [];
//   const all = [...products, ...barcodeItems.map(barcodeProductToProduct)];

//   const wishlist = all.map((p) => {
//     const image = p.source === "erp" ? p.images[0] : undefined;
//     return {
//       sku: p.sku,
//       name: p.name,
//       price: p.pricing.sellingPrice,
//       mrp: p.pricing.mrp,
//       image,
//       href: image ? `/products/${p.slug}` : `/products/${p.slug}?comingSoon=1&name=${encodeURIComponent(p.name)}`,
//     };
//   });

//   return ok({
//     loggedIn: !!s,
//     customer: customer
//       ? { name: customer.name, email: customer.email ?? null, mobile: customer.mobile || null, loyaltyPoints: customer.loyaltyPoints }
//       : null,
//     wishlist,
//     orders: (orders?.items ?? []).map((o) => ({
//       orderNo: o.orderNo,
//       createdAt: o.createdAt ?? null,
//       itemCount: o.items.length,
//       total: o.netAmount,
//       status: o.orderStatus,
//       name: o.items[0]?.name ?? o.items[0]?.sku ?? "",
//       image: o.items[0]?.image ?? null,
//     })),
//     orderTotal: orders?.total ?? 0,
//   });
// });
////////////////////////////////////////////////////////


// FILE: src/app/api/v1/account/summary/route.ts   (NEW FILE)
// FIX: wishlist is returned only when logged in (guest likes are never shown).
// ADDED: GET handler - returns { loggedIn, customer, wishlist[], orders[], orderTotal } using existing getCustomerSession, getWishlistSkus, getCustomers, getOrders, getMasterData, getBarcodeLabels.
import { handler, ok } from "@/lib/api/response";
import { getCustomerSession } from "@/lib/auth";
import { getWishlistSkus } from "@/lib/cart-server";
import { barcodeProductToProduct } from "@/lib/erp-mapping";
import { getBarcodeLabels, getCustomers, getMasterData, getOrders } from "@/repositories";

export const dynamic = "force-dynamic";

/** GET /api/v1/account/summary — one fast call that fills the navbar: profile, liked products, recent orders. */
export const GET = handler(async () => {
  const s = await getCustomerSession();
  const skus = s ? await getWishlistSkus() : []; // guests: no saved data returned

  const [customer, orders, products] = await Promise.all([
    s ? getCustomers().getById(s.sub) : null,
    s ? getOrders().listByCustomer(s.sub, { limit: 5 }) : null,
    skus.length ? getMasterData().products.getBySkus(skus) : [],
  ]);
  const found = new Set(products.map((p) => p.sku));
  const missing = skus.filter((k) => !found.has(k));
  const barcodeItems = missing.length ? await getBarcodeLabels().getByBarcodes(missing) : [];
  const all = [...products, ...barcodeItems.map(barcodeProductToProduct)];

  const wishlist = all.map((p) => {
    const image = p.source === "erp" ? p.images[0] : undefined;
    return {
      sku: p.sku,
      name: p.name,
      price: p.pricing.sellingPrice,
      mrp: p.pricing.mrp,
      image,
      href: image ? `/products/${p.slug}` : `/products/${p.slug}?comingSoon=1&name=${encodeURIComponent(p.name)}`,
    };
  });

  return ok({
    loggedIn: !!s,
    customer: customer
      ? { name: customer.name, email: customer.email ?? null, mobile: customer.mobile || null, loyaltyPoints: customer.loyaltyPoints }
      : null,
    wishlist,
    orders: (orders?.items ?? []).map((o) => ({
      orderNo: o.orderNo,
      createdAt: o.createdAt ?? null,
      itemCount: o.items.length,
      total: o.netAmount,
      status: o.orderStatus,
      name: o.items[0]?.name ?? o.items[0]?.sku ?? "",
      image: o.items[0]?.image ?? null,
    })),
    orderTotal: orders?.total ?? 0,
  });
});
