"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProductCard } from "@/domain/types";
import { api } from "@/hooks/api";
import { Price } from "@/components/ui/price";
import { useUi } from "@/store/ui";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import { isRemoteImageSource } from "@/lib/utils";

export function SearchOverlay() {
  const open = useUi((s) => s.searchOpen);
  const setOpen = useUi((s) => s.setSearchOpen);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 50);
  }, [open]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: async () => (await api<ProductCard[]>(`/api/v1/products?q=${encodeURIComponent(debounced)}&limit=6`)).data,
    enabled: debounced.length >= 2 && open,
    placeholderData: keepPreviousData,
  });
  const waitingForCurrentQuery = q.trim().length >= 2 && (q.trim() !== debounced || isFetching);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[65] bg-ink/40" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-[10vh] w-[92%] max-w-2xl rounded-md bg-ivory shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <form
          className="flex items-center gap-3 border-b border-line px-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) {
              router.push(`/search?q=${encodeURIComponent(q.trim())}`);
              setOpen(false);
            }
          }}
        >
          <Search className="h-5 w-5 text-muted" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sarees, fabrics, weaves, colours…" className="h-14 flex-1 bg-transparent text-base focus:outline-none" />
          <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
        </form>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {debounced.length < 2 && <p className="p-4 text-sm text-muted">Try “Kanchipuram”, “Yanai”, “linen” or a colour.</p>}
          {waitingForCurrentQuery && <p className="p-4 text-sm text-muted">Searching…</p>}
          {!waitingForCurrentQuery && data?.length === 0 && <p className="p-4 text-sm text-muted">No products match “{debounced}”.</p>}
          {q.trim().length >= 2 && data?.map((p) => (
            <Link
              key={p.id}
              href={p.source === "erp" && p.images[0]
                ? `/products/${p.slug}`
                : `/products/${p.slug}?comingSoon=1&name=${encodeURIComponent(p.name)}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-sm p-2 hover:bg-olive/5"
            >
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-line">{p.images[0] ? <Image src={p.images[0]} alt="" fill unoptimized={isRemoteImageSource(p.images[0])} sizes="48px" className="object-cover" /> : <ComingSoonImage className="absolute inset-0" />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.web?.cardTitle || p.name}</p>
                <p className="text-xs text-muted">{p.fabric}</p>
              </div>
              <Price amount={p.pricing.sellingPrice} size="sm" />
            </Link>
          ))}
          {!waitingForCurrentQuery && data && data.length > 0 && (
            <Link href={`/search?q=${encodeURIComponent(debounced)}`} onClick={() => setOpen(false)} className="block p-3 text-center text-xs uppercase tracking-widest text-maroon">
              See all results →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
