// import type { Metadata, Viewport } from "next";
// import { Dancing_Script, Inter, Playfair_Display, Poppins } from "next/font/google";
// import { Providers } from "@/components/providers";
// import { ThemeStyle } from "@/components/ThemeStyle";
// import { env } from "@/lib/env";
// import { getSettings } from "@/lib/site-data";
// import { BRAND, DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE, DEFAULT_TITLE, SITE_NAME } from "@/lib/seo";
// import "./globals.css";

// const heading = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-heading", display: "swap" });
// const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
// const script = Dancing_Script({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-script", display: "swap" });
// const display = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

// /** The settings model's seeded title; when it is still in place the fuller default title is used. */
// const SEEDED_TITLE = "Woven Essence by Temple Fabrics";

// export async function generateMetadata(): Promise<Metadata> {
//   let s: Awaited<ReturnType<typeof getSettings>> | undefined;
//   try {
//     s = await getSettings();
//   } catch {
//     s = undefined; // DB down → still emit complete site-wide SEO from the defaults
//   }
//   const title = s?.seo?.defaultTitle && s.seo.defaultTitle !== SEEDED_TITLE ? s.seo.defaultTitle : DEFAULT_TITLE;
//   const description = s?.seo?.defaultDescription || DEFAULT_DESCRIPTION;
//   const ogImage = s?.seo?.ogImage || DEFAULT_OG_IMAGE;
//   // The seeded placeholder favicon counts as unset, so the real icons are used.
//   const favicon = s?.logo?.favicon && !s.logo.favicon.includes("favicon-placeholder") ? s.logo.favicon : undefined;
//   return {
//     metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
//     title: { default: title, template: `%s | ${SITE_NAME}` },
//     description,
//     keywords: DEFAULT_KEYWORDS,
//     applicationName: SITE_NAME,
//     authors: [{ name: BRAND, url: env.NEXT_PUBLIC_SITE_URL }],
//     creator: BRAND,
//     publisher: BRAND,
//     category: "shopping",
//     icons: {
//       icon: favicon ? [{ url: favicon }] : [{ url: "/icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
//       apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
//     },
//     manifest: "/manifest.webmanifest",
//     openGraph: {
//       type: "website",
//       locale: "en_IN",
//       siteName: BRAND,
//       title,
//       description,
//       images: [{ url: ogImage, width: 1200, height: 630, alt: BRAND }],
//     },
//     twitter: { card: "summary_large_image", title, description, images: [ogImage] },
//     robots: {
//       index: true,
//       follow: true,
//       googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
//     },
//   };
// }

// export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#db1a72" };

// export default async function RootLayout({ children }: { children: React.ReactNode }) {
//   let theme: Awaited<ReturnType<typeof getSettings>>["theme"] | undefined;
//   try {
//     theme = (await getSettings()).theme;
//   } catch {
//     theme = undefined; // DB down → CSS defaults in globals.css still apply
//   }
//   return (
//     <html lang="en-IN" className={`${heading.variable} ${body.variable} ${script.variable} ${display.variable}`}>
//       <head>
//         <ThemeStyle theme={theme} />
//       </head>
//       <body>
//         <Providers>{children}</Providers>
//       </body>
//     </html>
//   );
// }


////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Dancing_Script, Inter, Playfair_Display, Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeStyle } from "@/components/ThemeStyle";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/site-data";
import { BRAND, DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE, DEFAULT_TITLE, SITE_NAME } from "@/lib/seo";
import "./globals.css";

const heading = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-heading", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const script = Dancing_Script({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-script", display: "swap" });
const display = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

/** The settings model's seeded title; when it is still in place the fuller default title is used. */
const SEEDED_TITLE = "Woven Essence by Temple Fabrics";

export async function generateMetadata(): Promise<Metadata> {
  let s: Awaited<ReturnType<typeof getSettings>> | undefined;
  try {
    s = await getSettings();
  } catch {
    s = undefined; // DB down → still emit complete site-wide SEO from the defaults
  }
  const title = s?.seo?.defaultTitle && s.seo.defaultTitle !== SEEDED_TITLE ? s.seo.defaultTitle : DEFAULT_TITLE;
  const description = s?.seo?.defaultDescription || DEFAULT_DESCRIPTION;
  const ogImage = s?.seo?.ogImage || DEFAULT_OG_IMAGE;
  // The seeded placeholder favicon counts as unset, so the real icons are used.
  const favicon = s?.logo?.favicon && !s.logo.favicon.includes("favicon-placeholder") ? s.logo.favicon : undefined;
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: title, template: `%s | ${SITE_NAME}` },
    description,
    keywords: DEFAULT_KEYWORDS,
    applicationName: SITE_NAME,
    authors: [{ name: BRAND, url: env.NEXT_PUBLIC_SITE_URL }],
    creator: BRAND,
    publisher: BRAND,
    category: "shopping",
    icons: {
      icon: favicon ? [{ url: favicon }] : [{ url: "/icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: BRAND,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: BRAND }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#db1a72" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let theme: Awaited<ReturnType<typeof getSettings>>["theme"] | undefined;
  try {
    theme = (await getSettings()).theme;
  } catch {
    theme = undefined; // DB down → CSS defaults in globals.css still apply
  }
  return (
    <html lang="en-IN" className={`${heading.variable} ${body.variable} ${script.variable} ${display.variable}`}>
      <head>
        <ThemeStyle theme={theme} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}