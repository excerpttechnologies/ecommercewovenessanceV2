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
    <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
      {SECTIONS.map(({ key, title }) => (
        <div key={key}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-olive">{title}</h3>
          <p className="mt-1.5 text-ink/80">{info[key]}</p>
        </div>
      ))}
    </div>
  );
}
