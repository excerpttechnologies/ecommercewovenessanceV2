"use client";

import { Clock, MapPin, Navigation, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { buttonClass } from "@/components/ui/button";
import { businessInfo } from "@/lib/business";
import { cn } from "@/lib/utils";

export type StoreLocationInfo = Pick<
  ReturnType<typeof businessInfo>,
  "address" | "phone" | "hours"
>;

/** Google Maps deep link for the physical store address (no geolocation permission needed). */
export function storeDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** "+919945158629" from "9945158629" or "+91 99451 58629". */
export function storeTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return `tel:+91${local}`;
}

/** "9945158629" → "99451 58629" for display. */
function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : phone;
}

/**
 * Store Location trigger + popup. The address and phone come from the configured business
 * details (falling back to the physical Jayanagar store), never from the visitor's location.
 */
export function StoreLocation({
  store,
  variant = "bar",
  className,
}: {
  store: StoreLocationInfo;
  variant?: "bar" | "row";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const trigger =
    variant === "row" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "flex w-full items-center gap-2 text-left text-sm font-medium text-olive transition-colors hover:text-maroon",
          className,
        )}
      >
        <MapPin className="h-4 w-4 shrink-0 text-maroon" aria-hidden="true" />
        Store Location
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "flex items-center gap-1 whitespace-nowrap font-medium text-olive transition-colors hover:text-maroon",
          className,
        )}
      >
        Store Location
      </button>
    );

  return (
    <>
      {trigger}

      {/* Portalled to <body> so a transformed drawer can never clip or offset the popup. */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setOpen(false)}
          >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-location-title"
            onClick={(event) => event.stopPropagation()}
            className="we-pop relative w-full max-w-md overflow-hidden whitespace-normal rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="relative bg-gradient-to-br from-maroon to-[#8c1240] px-5 pb-5 pt-5 text-white sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">
                      Woven Essence
                    </p>
                    <h2
                      id="store-location-title"
                      className="font-display text-2xl font-semibold leading-tight"
                    >
                      Store Location
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setOpen(false)}
                  aria-label="Close store location"
                  className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Store address
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink/85">{store.address}</p>
                </div>
              </div>

              <a
                href={storeTelHref(store.phone)}
                className="group flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-maroon/40 hover:bg-maroon/[0.04]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Call the store
                  </span>
                  <span className="block text-[15px] font-medium text-olive group-hover:text-maroon">
                    {displayPhone(store.phone)}
                  </span>
                </span>
              </a>

              {store.hours && (
                <div className="flex items-center gap-3 px-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Store hours
                    </span>
                    <span className="block text-sm text-ink/80">{store.hours}</span>
                  </span>
                </div>
              )}

              <a
                href={storeDirectionsUrl(store.address)}
                target="_blank"
                rel="noreferrer"
                className={buttonClass("primary", "lg", "w-full")}
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Get Directions
              </a>
            </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
