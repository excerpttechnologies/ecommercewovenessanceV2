import Image from "next/image";
import { isRemoteImageSource } from "@/lib/utils";
import Link from "next/link";
import type { SiteSettings } from "@/repositories/web/site.repository";

interface LogoProps {
  settings: Pick<SiteSettings, "storeName" | "legalName">;
  height?: number;
  href?: string;
  className?: string;
}

/**
 * Uses the original Woven Essence logo from the public assets.
 */
export function Logo({ settings, height = 56, href = "/", className }: LogoProps) {
  const src = "/logo1.png";
  const alt = `${settings.storeName ?? "Woven Essence"} by ${settings.legalName ?? "Temple Fabrics"}`;
  const inner = src ? (
    <Image src={src} alt={alt} width={Math.round(height * 3.2)} height={height} priority unoptimized={isRemoteImageSource(src)} style={{ height, width: "auto" }} />
  ) : (
    <span className="font-heading text-2xl tracking-wide text-olive">
      {settings.storeName}
      <span className="block text-[0.6rem] font-body uppercase tracking-[0.3em] text-gold">by {settings.legalName}</span>
    </span>
  );
  return (
    <Link href={href} aria-label={alt} className={className}>
      {inner}
    </Link>
  );
}
