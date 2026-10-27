import { jsonLdScript } from "@/lib/seo";

/** Structured data for search engines: one schema.org @graph per call. */
export function JsonLd({ nodes }: { nodes: Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(nodes) }} />;
}
