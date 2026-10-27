import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/_next/image"],
        // Private, transactional and duplicate-content areas. Listing filters stay crawlable (their pages
        // are noindex + canonical) so the product links on them are still followed.
        disallow: ["/admin", "/api/", "/account", "/checkout", "/cart", "/search", "/wishlist", "/login", "/register", "/track-order"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
