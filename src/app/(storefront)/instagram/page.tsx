
import Link from "next/link";
import { getWebConnection } from "@/lib/db";
import {
  InstagramCurationModel,
  INSTAGRAM_CURATION_GROUP_KEYS,
} from "@/models/web/instagram-curation.model";
import { getMasterData } from "@/repositories";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InstagramShopPage() {
  const Model = InstagramCurationModel(await getWebConnection());
  const configs = await Model.find({
    key: { $in: [...INSTAGRAM_CURATION_GROUP_KEYS] },
    enabled: true,
  }).lean();
  const configByKey = new Map(configs.map((config) => [config.key, config]));
  const displayConfig =
    configByKey.get("default") ?? configs[0];
  const skus = [
    ...new Set(
      INSTAGRAM_CURATION_GROUP_KEYS.flatMap(
        (key) => configByKey.get(key)?.skus ?? [],
      )
        .map((sku) => sku.trim())
        .filter(Boolean),
    ),
  ];

  if (!skus.length) {
    return (
      <main className="container mx-auto px-4 py-16">
        <h1>Instagram Collection</h1>
        <p>Our curated collection is being updated. Please check back soon.</p>
      </main>
    );
  }

  const allProducts = await getMasterData().products.getBySkus(skus, {
    skipCache: true,
  });

  const products = allProducts.filter(
    (product) => product.isActive && product.stock.qty > 0,
  );

  const title = displayConfig?.title || "Shop our Instagram edit";
  const description =
    displayConfig?.description ||
    "Discover the pieces we are sharing on Instagram.";

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:pt-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Woven Essence by Temple Fabrics
          </p>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </p>

          <Link
            href="https://www.instagram.com/templefabrics"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
          >
            Follow us on Instagram
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border px-5 py-16 text-center">
            <h2 className="text-xl font-medium">
              Our collection is being updated
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Please visit again soon to discover our latest picks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {products.map((product) => {
              const price =
                product.web?.priceOverride ??
                product.pricing.sellingPrice;

              return (
                <Link
                  key={product.sku}
                  href={`/products/${product.slug}`}
                  className="group block"
                >
                  <div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Image coming soon
                      </div>
                    )}
                  </div>

                  <div className="pt-3">
                    <h2 className="line-clamp-2 text-sm font-medium">
                      {product.name}
                    </h2>
                    <p className="mt-1 text-sm">
                      {formatINR(price)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center">
          <Link
            href="/"
            className="text-sm font-medium underline underline-offset-4"
          >
            Continue shopping
          </Link>
        </div>
      </section>
    </main>
  );
}
