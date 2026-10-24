"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BarcodeFacets, FacetOption } from "@/domain/types";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = { facets: BarcodeFacets };

export function BarcodeCollectionFilters({ facets }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  };
  const choices: { key: string; label: string; options: FacetOption[] }[] = [
    { key: "subgroup", label: "Subgroup", options: facets.subgroup ?? [] },
    { key: "weave", label: "Weave", options: facets.weave ?? [] },
    { key: "fabric", label: "Fabric", options: facets.fabric ?? [] },
    { key: "craft", label: "Craft", options: facets.craft ?? [] },
    { key: "occasion", label: "Occasion", options: facets.occasion ?? [] },
    { key: "color", label: "Color", options: facets.color ?? [] },
    { key: "group", label: "Group", options: facets.group },
    { key: "business", label: "Business", options: facets.business },
    { key: "status", label: "Status", options: facets.status },
    { key: "uomType", label: "Unit", options: facets.uomType },
  ];

  return (
    <div className="my-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); update("q", String(new FormData(event.currentTarget).get("q") ?? "").trim()); }}>
        <Input name="q" defaultValue={sp.get("q") ?? ""} placeholder="Search products" aria-label="Search products" />
        <Button type="submit" variant="outline">Search</Button>
      </form>
      {choices.map(({ key, label, options }) => (
        <Select key={key} aria-label={`Filter by ${label.toLowerCase()}`} value={sp.get(key) ?? ""} onChange={(event) => update(key, event.target.value)}>
          <option value="">All {label.toLowerCase()}s</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label} ({option.count})</option>)}
        </Select>
      ))}
    </div>
  );
}