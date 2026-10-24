"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ImageIssue } from "@/domain/types";
import { cn } from "@/lib/utils";

export function ProductThumb({ src, alt, issue, sizes, className, fit = "cover", showFallbackMessage = false }: { src?: string; alt: string; issue?: ImageIssue; sizes: string; className?: string; fit?: "cover" | "contain"; showFallbackMessage?: boolean }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center rounded-sm bg-ivory text-center text-sm text-muted", className)}>
        {showFallbackMessage && (
          <span className="px-4">
            {failed || issue === "unavailable"
              ? "ERP image could not be loaded"
              : "No ERP image available"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-sm bg-line", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} unoptimized className={fit === "contain" ? "object-contain" : "object-cover"} onError={() => setFailed(true)} />
    </div>
  );
}
