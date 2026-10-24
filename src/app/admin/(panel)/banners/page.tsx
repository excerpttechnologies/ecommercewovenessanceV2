"use client";
import { Badge } from "@/components/ui/badge";
import { ResourcePage } from "@/components/admin/resource-page";

interface Banner { _id: string; placement: string; title?: string; image?: { desktop?: string }; ctaHref?: string; sortOrder: number; isActive: boolean }

export default function BannersPage() {
  return (
    <ResourcePage<Banner>
      resource="banners"
      title="Banners"
      filters={[{ key: "placement", label: "Placement", options: ["hero", "lifestyle", "category", "promo"].map((v) => ({ value: v, label: v })) }]}
      columns={[
        { key: "image", label: "", render: (r) => r.image?.desktop ? <img src={r.image.desktop} alt="" className="h-10 w-16 rounded-sm object-cover" /> : null },
        { key: "placement", label: "Placement", render: (r) => <Badge tone="gold">{r.placement}</Badge> },
        { key: "title", label: "Title" },
        { key: "ctaHref", label: "Link", className: "text-xs text-muted" },
        { key: "sortOrder", label: "Order" },
        { key: "isActive", label: "Active", render: (r) => <Badge tone={r.isActive ? "green" : "muted"}>{r.isActive ? "yes" : "no"}</Badge> },
      ]}
      fields={[
        { name: "placement", label: "Placement", type: "select", required: true, options: ["hero", "lifestyle", "category", "promo"].map((v) => ({ value: v, label: v })) },
        { name: "sortOrder", label: "Sort order", type: "number" },
        { name: "title", label: "Title", type: "text" },
        { name: "subtitle", label: "Subtitle / eyebrow", type: "text" },
        { name: "ctaLabel", label: "CTA label", type: "text" },
        { name: "ctaHref", label: "CTA link", type: "text" },
        { name: "image.desktop", label: "Desktop image", type: "image", required: true },
        { name: "image.mobile", label: "Mobile image", type: "image" },
        { name: "image.alt", label: "Alt text", type: "text" },
        { name: "align", label: "Text align", type: "select", options: ["left", "center", "right"].map((v) => ({ value: v, label: v })) },
        { name: "startsAt", label: "Starts", type: "date" },
        { name: "endsAt", label: "Ends", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
      ]}
      defaults={{ placement: "hero", isActive: true, sortOrder: 0 }}
    />
  );
}
