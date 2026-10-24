"use client";
import { Badge } from "@/components/ui/badge";
import { ResourcePage } from "@/components/admin/resource-page";

interface S { _id: string; key: string; title?: string; subtitle?: string; sortOrder: number; isVisible: boolean; config?: Record<string, unknown> }
const KEYS = ["hero", "trust", "categories", "featuredCollections", "newArrivals", "bestSellers", "collection", "occasions", "fabrics", "lifestyle", "testimonials", "instagram", "newsletter", "support"];

export default function HomepagePage() {
  return (
    <ResourcePage<S>
      resource="homepage"
      title="Homepage builder"
      sort="sortOrder:1"
      columns={[
        { key: "sortOrder", label: "#", className: "w-12" },
        { key: "key", label: "Section", render: (r) => <Badge tone="olive">{r.key}</Badge> },
        { key: "title", label: "Title" },
        { key: "config", label: "Config", className: "text-xs text-muted", render: (r) => JSON.stringify(r.config ?? {}) },
        { key: "isVisible", label: "Visible", render: (r) => <Badge tone={r.isVisible ? "green" : "muted"}>{r.isVisible ? "yes" : "hidden"}</Badge> },
      ]}
      fields={[
        { name: "key", label: "Section key", type: "select", required: true, options: KEYS.map((k) => ({ value: k, label: k })) },
        { name: "sortOrder", label: "Sort order", type: "number" },
        { name: "title", label: "Title", type: "text" },
        { name: "subtitle", label: "Subtitle", type: "text" },
        { name: "config", label: "Config (JSON)", type: "json", hint: '{"limit": 8} or {"slug": "wedding-edit"} for the collection section' },
        { name: "isVisible", label: "Visible", type: "boolean" },
      ]}
      defaults={{ isVisible: true, sortOrder: 99, config: {} }}
    />
  );
}
