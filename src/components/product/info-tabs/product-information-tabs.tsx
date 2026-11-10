"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CustomerCareInfo, ShippingReturnsInfo } from "@/lib/product-info";
import { ProductOverviewTab, type ProductOverviewRow } from "./product-overview-tab";
import { ShippingReturnsTab } from "./shipping-returns-tab";
import { FabricCareTab } from "./fabric-care-tab";
import { SilkMarkTab } from "./silk-mark-tab";
import { CustomerCareTab } from "./customer-care-tab";

const TABS = [
  { key: "overview", label: "More About The Product" },
  { key: "shipping", label: "Shipping And Returns" },
  { key: "care", label: "Silk Care" },
  { key: "silk-mark", label: "Silk Mark" },
  { key: "customer-care", label: "Customer Care" },
] as const;

export type ProductInfoTabKey = (typeof TABS)[number]["key"];

export interface ProductInformationTabsProps {
  productName: string;
  overview: ProductOverviewRow[];
  description?: string | null;
  material?: string | null;
  careInstructions?: string | null;
  /** Set only when the product's certification is verified in the database. */
  silkMark?: { certified: boolean; number?: string } | null;
  shipping: ShippingReturnsInfo;
  customerCare: CustomerCareInfo;
  /** Optional page-specific delivery widget (e.g. the pincode checker). */
  deliveryCheck?: ReactNode;
  defaultTab?: ProductInfoTabKey;
}

/**
 * The five product-information tabs shared by every product detail page.
 * All five stay mounted in the tab strip; on narrow screens the strip scrolls
 * horizontally and the selected tab is scrolled into view.
 */
export function ProductInformationTabs({
  productName,
  overview,
  description,
  material,
  careInstructions,
  silkMark,
  shipping,
  customerCare,
  deliveryCheck,
  defaultTab = "overview",
}: ProductInformationTabsProps) {
  const [active, setActive] = useState<ProductInfoTabKey>(defaultTab);
  const tabRefs = useRef<Partial<Record<ProductInfoTabKey, HTMLButtonElement | null>>>({});

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 1023px)").matches) return;
    tabRefs.current[active]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.key === active);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const key = TABS[next].key;
    setActive(key);
    tabRefs.current[key]?.focus();
  };

  return (
    <section className="mt-10 rounded-xl border border-line bg-white p-4 sm:mt-14 sm:p-6" aria-label="Product information">
      <div
        role="tablist"
        aria-label="Product information"
        onKeyDown={onKeyDown}
        className="we-scroller -mx-4 flex gap-1 overflow-x-auto border-b border-line bg-white px-4 sm:mx-0 sm:gap-3 sm:px-0"
      >
        {TABS.map((tab) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[tab.key] = node;
              }}
              type="button"
              role="tab"
              id={`product-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`product-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.key)}
              className={cn(
                "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium tracking-wide transition-colors sm:px-4 sm:text-sm",
                selected ? "border-olive text-olive" : "border-transparent text-ink/70 hover:text-olive",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        key={active}
        role="tabpanel"
        id={`product-panel-${active}`}
        aria-labelledby={`product-tab-${active}`}
        tabIndex={0}
        className="pt-6 text-[15px] leading-relaxed text-ink/85 outline-none transition-opacity duration-200"
      >
        {active === "overview" && (
          <ProductOverviewTab rows={overview} description={description} productName={productName} />
        )}
        {active === "shipping" && (
          <>
            {deliveryCheck && <div className="mb-6">{deliveryCheck}</div>}
            <ShippingReturnsTab info={shipping} />
          </>
        )}
        {active === "care" && (
          <FabricCareTab material={material} productName={productName} careInstructions={careInstructions} />
        )}
        {active === "silk-mark" && (
          <SilkMarkTab
            material={material}
            productName={productName}
            certified={silkMark?.certified === true}
            certificationNumber={silkMark?.number}
          />
        )}
        {active === "customer-care" && <CustomerCareTab info={customerCare} productName={productName} />}
      </div>
    </section>
  );
}
