import { z } from "zod";

/**
 * Server-only env. Never import from a client component.
 */
const blankToUndefined = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATA_SOURCE: z.enum(["mock", "erp"]).default("mock"),
    MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017"),
    WEB_DB_NAME: z.string().min(1).default("woven_essence_web"),
    LEGACY_BRIDGE_BRANCH_ID: z.string().optional(),
    ERP_MONGODB_URI: z.string().optional(),
    /** Same as ERP_MONGODB_URI — the name the RetailERP backend's .env uses. ERP_MONGODB_URI wins if both are set. */
    ERP_MONGO_URI: z.string().optional(),
    ERP_DB_NAME: z.string().min(1).default("grooretailerp1"),
    /** Origin of the deployed RetailERP web app. Relative ERP image paths (e.g. /august_8A_images/4A1142.jpg) are served from here. */
    ERP_IMAGE_BASE: z.string().optional(),
    /** Comma-separated DigitalOcean Spaces bucket hosts ERP images may come from (keep in sync with next.config.ts). */
    ERP_IMAGE_SPACES_HOSTS: z.string().default("templeimg.blr1.digitaloceanspaces.com"),
    /** Optional DigitalOcean Spaces keys. When set, private ERP images in those buckets are served via fresh presigned URLs. */
    DO_SPACES_KEY: z.string().optional(),
    DO_SPACES_SECRET: z.string().optional(),
    /** NVIDIA API key (nvapi-…, from build.nvidia.com) for Admin → AI Assistant. Server-only; never sent to the browser. */
    NVIDIA_API_KEY: z.string().optional(),
    /** Chat model served by the NVIDIA API; it must support tool calling. */
    NVIDIA_MODEL: z.string().optional(),
    NVIDIA_BASE_URL: z.string().optional(),
    JWT_SECRET: z.string().min(16).default("dev-only-secret-change-me-please-now"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    NEXT_PUBLIC_SITE_URL: z.string().default("http://localhost:3000"),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
  })
  .transform((e) => ({
    ...e,
    ERP_MONGODB_URI: blankToUndefined(e.ERP_MONGODB_URI) ?? blankToUndefined(e.ERP_MONGO_URI) ?? e.MONGODB_URI,
    LEGACY_BRIDGE_BRANCH_ID: blankToUndefined(e.LEGACY_BRIDGE_BRANCH_ID),
    ERP_IMAGE_BASE: blankToUndefined(e.ERP_IMAGE_BASE)?.replace(/\/+$/, ""),
    ERP_IMAGE_SPACES_HOSTS: e.ERP_IMAGE_SPACES_HOSTS.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean),
    DO_SPACES_KEY: blankToUndefined(e.DO_SPACES_KEY),
    DO_SPACES_SECRET: blankToUndefined(e.DO_SPACES_SECRET),
    NVIDIA_API_KEY: blankToUndefined(e.NVIDIA_API_KEY),
    NVIDIA_MODEL: blankToUndefined(e.NVIDIA_MODEL) ?? "nvidia/nemotron-3-super-120b-a12b",
    NVIDIA_BASE_URL: blankToUndefined(e.NVIDIA_BASE_URL)?.replace(/\/+$/, "") ?? "https://integrate.api.nvidia.com/v1",
    RAZORPAY_KEY_ID: blankToUndefined(e.RAZORPAY_KEY_ID),
    RAZORPAY_KEY_SECRET: blankToUndefined(e.RAZORPAY_KEY_SECRET),
  }));

const rawEnv = {
  ...process.env,
  MONGODB_URI: process.env.MONGODB_URI ?? process.env.MONGO_URI,
  ERP_MONGODB_URI: process.env.ERP_MONGODB_URI ?? process.env.ERP_MONGO_URI,
};

export const env = schema.parse(rawEnv);
export type Env = typeof env;
