import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeStyle } from "@/components/ThemeStyle";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/site-data";
import "./globals.css";

const heading = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-heading", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSettings();
    return {
      title: { default: s.seo?.defaultTitle ?? "Woven Essence", template: `%s | ${s.storeName}` },
      description: s.seo?.defaultDescription ?? s.tagline,
      icons: { icon: s.logo?.favicon ?? "/mock/favicon-placeholder.svg" },
      metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
      openGraph: { siteName: s.storeName, type: "website", images: s.seo?.ogImage ? [s.seo.ogImage] : undefined },
    };
  } catch {
    return { title: "Woven Essence by Temple Fabrics" };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let theme: Awaited<ReturnType<typeof getSettings>>["theme"] | undefined;
  try {
    theme = (await getSettings()).theme;
  } catch {
    theme = undefined; // DB down → CSS defaults in globals.css still apply
  }
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <ThemeStyle theme={theme} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
