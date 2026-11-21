/**
 * Image availability audit for storefront catalogues.
 *
 *   npx tsx scripts/audit-images.ts                          # first 50 items of each main group
 *   npx tsx scripts/audit-images.ts --groups plain-fabrics --limit 700 --all
 *   npx tsx scripts/audit-images.ts --csv docs/image-audit.csv
 *
 * It loads each group's eligible catalogue (the same filters the storefront uses), then checks
 * every candidate URL for each barcode. Results are counts + barcode examples only — no customer
 * data. It never modifies the database. A nonzero exit status means at least one sampled item
 * has no image candidate that loads; use that in CI as a content-quality gate.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { closeConnections } from "@/lib/db";
import { env } from "@/lib/env";
import { barcodeImageCandidates, mapLimit, probeImage } from "@/lib/erp-images";
import { getBarcodeImageCatalog, ERP_CATEGORY_TITLES, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";

const args = process.argv.slice(2);
const valueOf = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const DEFAULT_GROUPS: StorefrontCategoryGroup[] = ["sarees", "fabrics", "plain-fabrics", "dupatta"];
const groups = (valueOf("--groups") ?? DEFAULT_GROUPS.join(",")).split(",").map((s) => s.trim()).filter(Boolean) as StorefrontCategoryGroup[];
const limit = Math.max(1, Number(valueOf("--limit") ?? 50));
const csvPath = valueOf("--csv");
const concurrency = Math.max(1, Number(valueOf("--concurrency") ?? 10));

function bool(v: boolean) { return v ? "1" : "0"; }

async function main() {
  const opts = {
    imageBase: env.NEXT_PUBLIC_IMAGE_BASE_URL,
    base: env.ERP_IMAGE_BASE,
    spacesHosts: env.ERP_IMAGE_SPACES_HOSTS,
    ...(env.DO_SPACES_KEY && env.DO_SPACES_SECRET
      ? { spaces: { accessKeyId: env.DO_SPACES_KEY, secretAccessKey: env.DO_SPACES_SECRET } }
      : {}),
  };
  const allRows: Array<Record<string, string | number>> = [];
  let anyMissing = false;

  for (const group of groups) {
    const catalog = await getBarcodeImageCatalog(group, 1, {}, limit);
    const rows = await mapLimit(catalog.items, concurrency, async (item) => {
      const urls = barcodeImageCandidates(item.barcode, opts);
      const results = await mapLimit(urls, concurrency, (url) => probeImage(url));
      const okIndex = results.findIndex((r) => r === true);
      return {
        group,
        barcode: item.barcode,
        eligibleTotal: catalog.total,
        candidates: urls.length,
        firstLoadable: okIndex >= 0 ? urls[okIndex] : "",
        sampleProbe: results[0] === null ? "unknown" : bool(results[0] === true),
      };
    });
    const missing = rows.filter((r) => !r.firstLoadable);
    anyMissing ||= missing.length > 0;
    console.log(
      `\n${ERP_CATEGORY_TITLES[group]} [${group}]: eligible=${catalog.total}, sampled=${rows.length}, ` +
      `withImage=${rows.length - missing.length}, withoutImage=${missing.length}`,
    );
    if (missing.length) console.log(`  no image: ${missing.slice(0, 12).map((r) => r.barcode).join(", ")}${missing.length > 12 ? " …" : ""}`);
    allRows.push(...rows);
  }

  if (csvPath) {
    const header = "group,barcode,eligibleTotal,candidates,firstLoadable,sampleProbe";
    const lines = allRows.map((r) => [r.group, r.barcode, r.eligibleTotal, r.candidates, r.firstLoadable, r.sampleProbe].join(","));
    writeFileSync(csvPath, [header, ...lines].join("\n") + "\n", "utf8");
    console.log(`\nWrote ${csvPath} (${allRows.length} rows)`);
  }
  console.log(anyMissing ? "\nRESULT: some sampled products have no loadable image." : "\nRESULT: all sampled products have a loadable image.");
  if (anyMissing) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Image audit failed:", String((error as Error)?.message ?? error));
    process.exitCode = 1;
  })
  .finally(closeConnections);
