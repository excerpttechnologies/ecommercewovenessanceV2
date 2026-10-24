import type { SiteSettings } from "@/repositories/web/site.repository";

export interface ThemeTokens {
  ivory?: string | null;
  olive?: string | null;
  gold?: string | null;
  maroon?: string | null;
  ink?: string | null;
  muted?: string | null;
  line?: string | null;
}

export const DEFAULT_THEME: Record<keyof ThemeTokens, string> = { ivory: "#FBF7EF", olive: "#3E4A2A", gold: "#B8893B", maroon: "#7A1F2B", ink: "#2A2A26", muted: "#6E6A60", line: "#E6DFD0" };

/** "#3E4A2A" → "62 74 42" (Tailwind alpha-friendly channel triplet). */
export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/**
 * Injects siteSettings.theme as CSS variables. Server component; no JS shipped.
 * Tailwind classes (bg-ivory, text-olive/80, ...) resolve to these variables.
 */
export function ThemeStyle({ theme }: { theme?: SiteSettings["theme"] | ThemeTokens | null }) {
  const t = (theme ?? {}) as ThemeTokens;
  const css = (Object.keys(DEFAULT_THEME) as (keyof ThemeTokens)[])
    .map((k) => {
      const hex = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(t[k] ?? "") ? (t[k] as string) : DEFAULT_THEME[k];
      return `--we-${k}:${hex};--we-${k}-rgb:${hexToRgb(hex)};`;
    })
    .join("");
  return <style dangerouslySetInnerHTML={{ __html: `:root{${css}}` }} />;
}
