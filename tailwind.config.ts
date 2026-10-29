import type { Config } from "tailwindcss";

/**
 * Brand tokens are CSS variables (see src/app/globals.css). The values are
 * injected at runtime from siteSettings.theme by <ThemeStyle />, so the admin
 * panel can change the palette without a rebuild. Colours are exposed as RGB
 * channel triplets (--we-*-rgb) so Tailwind opacity modifiers (bg-olive/10) work.
 */
const token = (name: string) => `rgb(var(--we-${name}-rgb) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: token("ivory"),
        olive: token("olive"),
        gold: token("gold"),
        maroon: token("maroon"),
        ink: token("ink"),
        muted: token("muted"),
        line: token("line"),
        brass: "#B08A4A",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        script: ["var(--font-script)", "cursive"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      maxWidth: { site: "1680px" },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px -6px rgb(0 0 0 / 0.08)",
        lift: "0 12px 32px -12px rgb(0 0 0 / 0.22)",
      },
    },
  },
  plugins: [],
};
export default config;
