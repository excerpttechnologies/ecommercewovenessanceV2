import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn, isRemoteImageSource } from "@/lib/utils";
import { AccentTitle } from "@/components/ui/section-heading";
import { LeafSpray, Lotus } from "@/components/ui/ornaments";

export interface CuratedTile {
  slug: string;
  title: string;
  tagline?: string;
  /** Published pieces in the category; omitted when the ERP count is unknown. */
  count?: number;
  image: string;
}

const pieces = (n: number) => `${n} ${n === 1 ? "piece" : "pieces"} available`;
const arrowBtn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/70 bg-black/30 text-white backdrop-blur-sm transition-all duration-300 group-hover:translate-x-1 group-hover:border-maroon group-hover:bg-maroon";

function TileImage({ tile, sizes, priority }: { tile: CuratedTile; sizes: string; priority?: boolean }) {
  return (
    <Image
      src={tile.image}
      alt={`${tile.title} collection at Woven Essence by Temple Fabrics`}
      fill
      priority={priority}
      unoptimized={isRemoteImageSource(tile.image)}
      sizes={sizes}
      className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
    />
  );
}

function FeatureTile({ tile, tall, wide }: { tile: CuratedTile; tall: boolean; wide: boolean }) {
  return (
    <Link href={`/collections/${tile.slug}`} className={cn("group relative block min-h-[360px] overflow-hidden rounded-lg bg-line lg:min-h-0", tall && "lg:row-span-2")}>
      <div className={cn("absolute inset-y-0 right-0 w-full sm:w-[72%]", wide && "lg:w-[38%]")}>
        <TileImage tile={tile} sizes="(min-width: 1024px) 32vw, 100vw" priority />
      </div>
      {/* warm wall-coloured fill on the left that melts into the photo, then the magenta wash behind the text */}
      <div className={cn("absolute inset-0 max-sm:hidden", wide ? "bg-[linear-gradient(90deg,#d9c8b9_0%,#d9c8b9_58%,rgba(217,200,185,0)_68%)]" : "bg-[linear-gradient(90deg,#d9c8b9_0%,#d9c8b9_26%,rgba(217,200,185,0)_45%)]")} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(140,18,72,0.92)_0%,rgba(140,18,72,0.55)_38%,transparent_70%)]" />
      <span className={cn(arrowBtn, "absolute right-6 top-[38%]")} aria-hidden><ArrowRight className="h-4 w-4" /></span>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
        <div className="flex items-center gap-3 text-[#e8c27a]">
          <Lotus className="h-5 w-7" />
          <span className="h-px w-32 bg-current opacity-70" />
        </div>
        <h3 className="mt-2 font-display text-[32px] leading-tight font-medium text-white">{tile.title}</h3>
        {tile.tagline && <p className="mt-2 max-w-[13rem] text-[15px] leading-snug text-white/95">{tile.tagline}</p>}
        <span className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-maroon px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(219,26,114,0.9)] transition-colors group-hover:bg-gold">
          Explore {tile.title} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
        {tile.count != null && <p className="mt-5 flex items-center gap-3 text-[13px] text-white/90"><span className="h-px w-6 bg-white/70" />{pieces(tile.count)}</p>}
      </div>
    </Link>
  );
}

function SmallTile({ tile }: { tile: CuratedTile }) {
  return (
    <Link href={`/collections/${tile.slug}`} className="group relative block aspect-[16/9] overflow-hidden rounded-lg bg-line sm:aspect-auto sm:min-h-[240px] lg:min-h-0">
      <TileImage tile={tile} sizes="(min-width: 1024px) 26vw, (min-width: 640px) 50vw, 100vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-2xl font-medium leading-tight text-white">{tile.title}</h3>
          {tile.count != null && <p className="mt-0.5 text-[13px] text-white/90">{pieces(tile.count)}</p>}
        </div>
        <span className={arrowBtn} aria-hidden><ArrowRight className="h-4 w-4" /></span>
      </div>
    </Link>
  );
}

export function CuratedCollections({ tiles, title, subtitle }: { tiles: CuratedTile[]; title?: string | null; subtitle?: string | null }) {
  if (!tiles.length) return null;
  const [feature, ...rest] = tiles;
  const heading = !title || title.trim().toLowerCase() === "curated collections" ? "Curated Collections" : title;
  return (
    <section data-reveal className="relative overflow-hidden bg-[radial-gradient(ellipse_at_100%_0%,rgba(219,26,114,0.13),transparent_42%),radial-gradient(ellipse_at_0%_100%,rgba(219,26,114,0.12),transparent_40%)]">
      <LeafSpray className="absolute right-[18%] top-0 hidden h-44 w-40 -scale-x-100 text-maroon/15 lg:block" />
      <LeafSpray className="absolute -left-10 bottom-10 hidden h-56 w-48 text-maroon/10 lg:block" />
      <div className="relative mx-auto max-w-site px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brass">
              Explore our <span className="h-px w-40 bg-brass/60 sm:w-64" />
            </p>
            <h2 className="mt-2 font-display text-[34px] font-medium tracking-tight text-olive sm:text-5xl sm:leading-[1.1]"><AccentTitle title={heading} /></h2>
            <p className="mt-2 max-w-2xl text-[15px] text-muted">{subtitle ?? "Discover handcrafted sarees, elegant fabrics and timeless designs crafted for every occasion."}</p>
          </div>
          <Link href="/collections" className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-maroon px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(219,26,114,0.9)] transition-colors hover:bg-gold">
            View All <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {/* Only categories with stock get a tile, so the grid adapts: up to 2 extras sit in one row beside
            the feature, 3–4 fill a 2×2 block, and a lone category spans the full width. */}
        <div className={cn("grid gap-4", rest.length > 2 ? "lg:h-[470px] lg:grid-cols-[1.55fr_1fr_1fr] lg:grid-rows-2" : "lg:h-[380px]", rest.length === 2 && "lg:grid-cols-[1.55fr_1fr_1fr]", rest.length === 1 && "lg:grid-cols-[1.55fr_1fr]")}>
          <FeatureTile tile={feature} tall={rest.length > 2} wide={rest.length === 0} />
          {rest.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:contents">
              {rest.map((tile) => <SmallTile key={tile.slug} tile={tile} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
