"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import { isRemoteImageSource } from "@/lib/utils";
import { imageBelongsToBarcode } from "@/lib/image-matcher";

interface OrderItemImageProps {
  src?: string | null;
  sku?: string | null;
  fallbackSources?: string[];
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  compact?: boolean;
}

export function OrderItemImage({
  src,
  sku,
  fallbackSources = [],
  alt = "Product image",
  fill = true,
  width,
  height,
  sizes = "72px",
  className = "object-cover",
  compact = false,
}: OrderItemImageProps) {
  const [failedSources, setFailedSources] = useState<string[]>([]);

  const candidateSources = useMemo(() => {
    const list: string[] = [];
    if (src && typeof src === "string" && src.trim()) {
      const cleanSrc = src.trim();
      if (!sku || imageBelongsToBarcode(cleanSrc, sku)) {
        list.push(cleanSrc);
      }
    }
    for (const fb of fallbackSources) {
      if (fb && typeof fb === "string" && fb.trim()) {
        const cleanFb = fb.trim();
        if (!sku || imageBelongsToBarcode(cleanFb, sku)) {
          list.push(cleanFb);
        }
      }
    }
    if (sku && typeof sku === "string") {
      const cleanSku = sku.trim();
      if (cleanSku) {
        list.push(`https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/${encodeURIComponent(cleanSku)}.jpg`);
        list.push(`https://templeimg.blr1.digitaloceanspaces.com/${encodeURIComponent(cleanSku)}.jpg`);
        const prefix = cleanSku.length >= 2 ? cleanSku.slice(0, 2).toUpperCase() : "";
        if (prefix && !/^\d+$/.test(cleanSku)) {
          list.push(`https://erp.wovenessence.in/images/${prefix}/${encodeURIComponent(cleanSku)}.jpg`);
        }
      }
    }
    return Array.from(new Set(list));
  }, [src, sku, fallbackSources]);

  const currentSource = candidateSources.find((s) => !failedSources.includes(s));

  if (!currentSource) {
    return <ComingSoonImage compact={compact} className="absolute inset-0 h-full w-full" />;
  }

  return (
    <Image
      key={currentSource}
      src={currentSource}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      sizes={sizes}
      unoptimized={isRemoteImageSource(currentSource)}
      className={className}
      onError={() => {
        setFailedSources((prev) => (prev.includes(currentSource) ? prev : [...prev, currentSource]));
      }}
    />
  );
}
