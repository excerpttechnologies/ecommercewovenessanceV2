import type { ShippingReturnsInfo } from "@/lib/product-info";

const SECTIONS: { key: keyof ShippingReturnsInfo; title: string }[] = [
  { key: "processing", title: "Order processing" },
  { key: "availability", title: "Shipping availability" },
  { key: "delivery", title: "Estimated delivery" },
  { key: "international", title: "International shipping" },
  { key: "charges", title: "Shipping charges" },
  { key: "returnEligibility", title: "Return eligibility" },
  { key: "exchange", title: "Exchange conditions" },
  { key: "refunds", title: "Refund process" },
  { key: "damaged", title: "Damaged or incorrect product" },
  { key: "howToRequest", title: "How to request a return" },
];

export function ShippingReturnsTab({ info }: { info: ShippingReturnsInfo }) {
  return (
    <div className="sm:columns-2 sm:gap-x-8 space-y-0">
      {SECTIONS.map(({ key, title }) => (
        <div key={key} className="mb-3 break-inside-avoid">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-olive">{title}</h3>
          <p className="m-0 mt-0.5 text-sm leading-snug text-ink/80">{info[key]}</p>
        </div>
      ))}
    </div>
  );
}
