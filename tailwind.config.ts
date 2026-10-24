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
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      maxWidth: { site: "1360px" },
    },
  },
  plugins: [],
};
export default config;
