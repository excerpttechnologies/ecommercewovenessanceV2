import type { Metadata } from "next";
import { parseProductListParams } from "@/lib/api/query";
import { Listing } from "@/components/listing/listing";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) (Array.isArray(v) ? v : v ? [v] : []).forEach((x) => u.append(k, x));
  const parsed = parseProductListParams(u);
  const params = parsed.ok ? parsed.params : {};
  const q = params.q ?? "";
  return <Listing title={q ? `Results for “${q}”` : "Search"} breadcrumbs={[{ label: "Search" }]} params={params} />;
}
