import { Check } from "lucide-react";
import { fabricCareFor } from "@/lib/product-info";

/** Silk gets its dedicated silk-care guidance; every other fabric gets matching care. */
export function FabricCareTab({
  material,
  productName,
  careInstructions,
}: {
  material?: string | null;
  productName: string;
  careInstructions?: string | null;
}) {
  const care = fabricCareFor(material, productName);
  return (
    <div>
      <h3 className="font-display text-xl font-semibold text-olive">{care.heading}</h3>
      {material && <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">Material: {material}</p>}
      <p className="mt-3 max-w-3xl text-ink/80">{care.intro}</p>
      <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {care.items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <Check className="mt-1 h-4 w-4 shrink-0 text-maroon" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {careInstructions && (
        <div className="mt-6 max-w-3xl rounded-lg bg-ivory px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Care note for this piece</p>
          <p className="mt-1 text-ink/80">{careInstructions}</p>
        </div>
      )}
    </div>
  );
}
