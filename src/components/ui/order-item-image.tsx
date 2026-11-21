"use client";

import { useState } from "react";
import Image from "next/image";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import { isRemoteImageSource } from "@/lib/utils";

interface OrderItemImageProps {
  src?: string | null;
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
  alt = "Product image",
  fill = true,
  width,
  height,
  sizes = "72px",
  className = "object-cover",
  compact = false,
}: OrderItemImageProps) {
  const [error, setError] = useState(false);

  // If no source or error occurred during loading, render the clean fallback component
  if (!src || error) {
    return <ComingSoonImage compact={compact} className="absolute inset-0 h-full w-full" />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      sizes={sizes}
      unoptimized={isRemoteImageSource(src)}
      className={className}
      onError={() => setError(true)}
    />
  );
}
