// src/components/listing/new-arrivals-view.tsx
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BarcodeProductGrid } from "@/components/product/barcode-product-grid";
import { getNewArrivals } from "@/lib/new-arrivals";
import { NEW_BADGE_MAX_DAYS } from "@/lib/new-badge";

export async function NewArrivalsView() {
  const sections = await getNewArrivals();
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  return (
    <div className="bg-[#fbf7f2]">
      <div className="mx-auto max-w-site px-4 pb-10 pt-5 sm:px-6">
        <Breadcrumbs items={[{ label: "New Arrivals" }]} />
        <div className="mt-6">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brass">
            Just In <span className="h-px w-12 bg-brass/60" />
          </p>
          <h1 className="mt-2 font-display text-5xl font-semibold leading-none tracking-tight sm:text-6xl">New Arrivals</h1>
          <p className="mt-3 max-w-xl font-display text-base text-ink/75 sm:text-lg">
            {total ? `${total} new pieces added in the last ${NEW_BADGE_MAX_DAYS} days.` : `Nothing new in the last ${NEW_BADGE_MAX_DAYS} days.`}
          </p>
        </div>
        {sections.length ? (
          sections.map((section) => (
            <section key={section.group} className="mt-10">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold">{section.title}</h2>
                <Link href={`/collections/${section.group}?sort=newest`} className="text-sm font-semibold text-maroon hover:underline">View all</Link>
              </div>
              <BarcodeProductGrid items={section.items} collectionSlug={section.group} wide />
            </section>
          ))
        ) : (
          <p className="py-16 text-center text-sm text-muted">No new arrivals right now. Please check back soon.</p>
        )}
      </div>
    </div>
  );
}
