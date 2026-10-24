"use client";
import { Badge } from "@/components/ui/badge";
import { ResourcePage, useAdminList } from "@/components/admin/resource-page";

interface MenuItem { _id: string; label: string; kind: "top" | "group" | "link"; parentId?: string | null; href?: string; sortOrder: number; isActive: boolean; badge?: string }

export default function MenuPage() {
  const all = useAdminList<MenuItem>("menu", { limit: 200 });
  const items = all.data?.data ?? [];
  const parents = items.filter((i) => i.kind !== "link").map((i) => ({ value: i._id, label: `${i.kind === "top" ? "" : "  ↳ "}${i.label}` }));
  const nameOf = (id?: string | null) => items.find((i) => i._id === id)?.label ?? "—";
  return (
    <ResourcePage<MenuItem>
      resource="menu"
      title="Menu builder"
      sort="sortOrder:1"
      limit={200}
      columns={[
        { key: "label", label: "Label", render: (r) => <span className={r.kind === "top" ? "font-medium" : r.kind === "group" ? "pl-4 text-gold" : "pl-8"}>{r.label}{r.badge && <Badge tone="maroon" className="ml-2">{r.badge}</Badge>}</span> },
        { key: "kind", label: "Menu type", render: (r) => r.kind === "top" ? "Main menu item" : r.kind === "group" ? "Category group" : "Category link" },
        { key: "parentId", label: "Parent menu item", render: (r) => nameOf(r.parentId) },
        { key: "sortOrder", label: "Order" },
        { key: "isActive", label: "Active", render: (r) => <Badge tone={r.isActive ? "green" : "muted"}>{r.isActive ? "yes" : "no"}</Badge> },
      ]}
      fields={[
        { name: "label", label: "Label", type: "text", required: true },
        { name: "kind", label: "Menu type", type: "select", required: true, options: [{ value: "top", label: "Main menu item" }, { value: "group", label: "Category group" }, { value: "link", label: "Category link" }] },
        { name: "parentId", label: "Parent", type: "select", options: () => parents },
        { name: "sortOrder", label: "Sort order", type: "number" },
        { name: "href", label: "Href (override)", type: "text", hint: "Leave blank to build from category + filter" },
        { name: "categorySlug", label: "Category slug", type: "text" },
        { name: "filterKey", label: "Filter key", type: "text", placeholder: "fabric / occasion / color / weave" },
        { name: "filterValue", label: "Filter value", type: "text" },
        { name: "image", label: "Image (mega-menu)", type: "image" },
        { name: "badge", label: "Badge", type: "text", placeholder: "New / Sale" },
        { name: "isActive", label: "Active", type: "boolean" },
      ]}
      defaults={{ kind: "link", isActive: true, sortOrder: 0 }}
    />
  );
}
