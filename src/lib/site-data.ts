// // import { cache } from "react";
// // import { getMasterData, getSite } from "@/repositories";
// // import { withErpFilterColumns } from "@/lib/erp-menu";

// // /** Per-request memoised loaders so header, footer and page share one query. */
// // export const getSettings = cache(() => getSite().settings());
// // export const getMenu = cache(async () => withErpFilterColumns(await getSite().menu()));
// // export const getCategoryTree = cache(() => getMasterData().categories.tree());
// // export const getStores = cache(() => getMasterData().stores.list());
// // export const getFooterPages = cache(async () => {
// //   const pages = await getSite().pages();
// //   return pages.map((p) => ({ title: p.title, slug: p.slug, type: p.type }));
// // });

// //////////////////////////////////////////////////////////////////////

// // src/lib/site-data.ts
// import { cache } from "react";
// import { getMasterData, getSite } from "@/repositories";
// import { withErpFilterColumns, withBestBuyItem } from "@/lib/erp-menu";

// /** Per-request memoised loaders so header, footer and page share one query. */
// export const getSettings = cache(() => getSite().settings());
// export const getMenu = cache(async () => withBestBuyItem(await withErpFilterColumns(await getSite().menu())));
// export const getCategoryTree = cache(() => getMasterData().categories.tree());
// export const getStores = cache(() => getMasterData().stores.list());
// export const getFooterPages = cache(async () => {
//   const pages = await getSite().pages();
//   return pages.map((p) => ({ title: p.title, slug: p.slug, type: p.type }));
// });

////////////////////////////////////////////////////////////////////////

// src/lib/site-data.ts
import { cache } from "react";
import { getMasterData, getSite } from "@/repositories";
import { withErpFilterColumns, withBestBuyItem } from "@/lib/erp-menu";

/** Per-request memoised loaders so header, footer and page share one query. */
export const getSettings = cache(() => getSite().settings());
export const getMenu = cache(async () => withBestBuyItem(await withErpFilterColumns(await getSite().menu())));
export const getCategoryTree = cache(() => getMasterData().categories.tree());
export const getStores = cache(() => getMasterData().stores.list());
export const getFooterPages = cache(async () => {
  const pages = await getSite().pages();
  return pages.map((p) => ({ title: p.title, slug: p.slug, type: p.type }));
});