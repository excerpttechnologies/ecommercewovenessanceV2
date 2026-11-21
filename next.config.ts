import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

/**
 * RetailERP image hosts — keep in sync with isAllowedImageUrl() in src/lib/erp-images.ts:
 *  - ERP_IMAGE_SPACES_HOSTS: the DigitalOcean Spaces bucket(s) the ERP uploads product photos to
 *    (exact hosts, never a wildcard: /_next/image is public and would proxy any bucket)
 *  - ERP_IMAGE_BASE: the deployed RetailERP web app that serves relative paths like /august_8A_images/…,
 *    /api/files/…, and /images/…
 */
function erpImagePatterns(): RemotePattern[] {
  const spacesHosts = (process.env.ERP_IMAGE_SPACES_HOSTS ?? "templeimg.blr1.digitaloceanspaces.com")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const patterns: RemotePattern[] = spacesHosts.map((hostname) => ({ protocol: "https", hostname, pathname: "/**" }));
  const base = process.env.ERP_IMAGE_BASE?.trim();
  if (base) {
    try {
      const u = new URL(base);
      patterns.push({ protocol: u.protocol.replace(":", "") as "http" | "https", hostname: u.hostname, ...(u.port ? { port: u.port } : {}), pathname: "/**" });
    } catch {
      console.warn("[next.config] ERP_IMAGE_BASE is not a valid URL; relative ERP images will not load");
    }
  }
  return patterns;
}

const nextConfig: NextConfig = {
  // Optional separate output folder (e.g. a preview build next to a running `next dev`, which owns .next).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["mongoose"],
  compress: true,
  poweredByHeader: false,
  // Opt-in standalone bundle for a small PM2/VPS image (set NEXT_OUTPUT=standalone).
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  images: {
    // Serve modern formats and cache optimised variants for a month. Product photos rarely change;
    // admin gallery edits bust the cache through their unique filenames.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "wovenessence.in", pathname: "/images/**" },
      { protocol: "https", hostname: "erp.wovenessence.in", pathname: "/august_8A_images/**" },
      { protocol: "https", hostname: "erp.wovenessence.in", pathname: "/api/files/**" },
      { protocol: "https", hostname: "erp.wovenessence.in", pathname: "/images/**" },
      ...erpImagePatterns(),
    ],
  },
};

export default nextConfig;
