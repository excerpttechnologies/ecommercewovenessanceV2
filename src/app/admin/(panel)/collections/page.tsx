"use client";
import { Badge } from "@/components/ui/badge";
import { ResourcePage } from "@/components/admin/resource-page";

interface Collection { _id: string; name: string; slug: string; type: "manual" | "rule"; rules?: unknown[]; skus?: string[]; isFeatured: boolean; isActive: boolean; sortOrder: number }

export default function CollectionsPage() {
  return (
    <ResourcePage<Collection>
      resource="collections"
      title="Collections"
      columns={[
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "slug", label: "Slug", className: "text-xs text-muted" },
        { key: "type", label: "Type", render: (r) => <Badge tone={r.type === "rule" ? "olive" : "gold"}>{r.type}</Badge> },
        { key: "rules", label: "Rules / Item Codes", render: (r) => (r.type === "rule" ? `${r.rules?.length ?? 0} rule(s)` : `${r.skus?.length ?? 0} item code(s)`) },
        { key: "isFeatured", label: "Featured", render: (r) => (r.isFeatured ? "★" : "") },
        { key: "isActive", label: "Active", render: (r) => <Badge tone={r.isActive ? "green" : "muted"}>{r.isActive ? "yes" : "no"}</Badge> },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "slug", label: "Slug", type: "text", required: true, hint: "lowercase-with-dashes → /collections/<slug>" },
        { name: "type", label: "Type", type: "select", required: true, options: [{ value: "rule", label: "Rule-based (auto)" }, { value: "manual", label: "Manual item codes" }] },
        { name: "sortOrder", label: "Sort order", type: "number" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "rules", label: "Rules (JSON)", type: "json", hint: 'e.g. [{"key":"fabric","op":"in","value":["Kanchipuram Silk"]},{"key":"priceMin","op":"gte","value":15000}] — keys: category, fabric, weave, color, occasion, craft, tag, priceMin, priceMax, discountMin, newArrivals' },
        { name: "skus", label: "Item Codes (JSON array)", type: "json" },
        { name: "banner.desktop", label: "Banner image", type: "image" },
        { name: "seoTitle", label: "SEO title", type: "text" },
        { name: "seoDescription", label: "SEO description", type: "textarea" },
        { name: "isFeatured", label: "Featured on home", type: "boolean" },
        { name: "isActive", label: "Active", type: "boolean" },
      ]}
      defaults={{ type: "rule", isActive: true, isFeatured: false, sortOrder: 0 }}
    />
  );
}
