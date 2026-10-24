import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isRemoteImageSource(src: string): boolean {
  return /^(?:https?:)?\/\//i.test(src);
}

/** URL-safe slug: "Maroon Kanchipuram Silk Saree" -> "maroon-kanchipuram-silk-saree" */
export function slugify(input: string): string {
  return String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Read a dotted path ("pricing.mrp") from an object. Returns undefined if any hop is missing. */
export function getPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Write a dotted path into an object, creating intermediate objects. Mutates and returns obj. */
export function setPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      cur[k] = value;
    } else {
      if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
      cur = cur[k] as Record<string, unknown>;
    }
  });
  return obj;
}

/** A same-site path for post-login redirects; rejects `//host` and `/\host`, which browsers treat as external. */
export function safeNextPath(next: string | undefined, fallback: string): string {
  return next && /^\/(?![/\\])/.test(next) ? next : fallback;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatINR(amount: number, opts: { decimals?: number } = {}): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(amount);
}

export function roundTo(n: number, step = 1): number {
  return Math.round(n / step) * step;
}
