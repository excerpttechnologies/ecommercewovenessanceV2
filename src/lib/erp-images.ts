import { createHash, createHmac } from "node:crypto";
import type { ImageIssue } from "@/domain/types";

/**
 * Turns the image references stored on RetailERP records into URLs a browser can load.
 * Server-only. Rules come from probing the real data (docs/barcodeLabel-product-mapping.md):
 *
 *  - https://<bucket>.<region>.digitaloceanspaces.com/<key>?X-Amz-…  — presigned with a 5-minute
 *    expiry at import time, so every stored signature is dead. The object URL without the query
 *    works for public-read objects; private objects need DO_SPACES_KEY/SECRET to presign afresh.
 *  - /august_8A_images/<barcode>.jpg (relative)                     — lives on the deployed
 *    RetailERP web app, i.e. ERP_IMAGE_BASE + path.
 *  - data:image/jpeg;base64,…                                        — one identical grey "image"
 *    icon on thousands of records: a placeholder, not a product photo. Other data URIs are kept.
 *  - anything else absolute                                          — only if its host is allowed.
 *
 * Every candidate is checked (results cached) so the UI never receives a dead URL.
 */

/** sha256 of the decoded bytes of the ERP's "no image" placeholder (2,042-byte JPEG). */
export const ERP_PLACEHOLDER_IMAGE_SHA256 = "ec0d918142dc57872c203df5a7073da46e790907dc500d8fa7303a24652f7087";

const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i;
const SPACES_HOST = /^([a-z0-9.-]+)\.([a-z0-9-]+)\.digitaloceanspaces\.com$/i;
const BARCODE_IMAGE_ORIGIN = "https://erp.wovenessence.in";
const BARCODE_IMAGE_PATH = /^\/august_8A_images\/[a-z0-9_-]+\.jpg$/i;

export function barcodeImageUrl(barcode: string): string | undefined {
  if (!/^[a-z0-9_-]+$/i.test(barcode)) return undefined;
  return `${BARCODE_IMAGE_ORIGIN}/august_8A_images/${encodeURIComponent(barcode)}.jpg`;
}

export interface SpacesCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface ImageResolveOptions {
  /** ERP_IMAGE_BASE — origin that serves relative ERP image paths. */
  base?: string;
  /** ERP_IMAGE_SPACES_HOSTS — the only Spaces buckets images may come from. */
  spacesHosts?: string[];
  spaces?: SpacesCredentials;
  now?: Date;
}

export type ImageRef = { url: string } | { placeholder: true } | null;

const sha256Hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const isSpacesHostAllowed = (host: string, opts: ImageResolveOptions) => (opts.spacesHosts ?? []).includes(host.toLowerCase());

/** One stored reference -> loadable URL, placeholder marker, or null (nothing usable). */
export function normalizeImageRef(ref: unknown, opts: ImageResolveOptions = {}): ImageRef {
  if (typeof ref !== "string") return null;
  const s = ref.trim();
  if (!s) return null;

  if (s.startsWith("data:")) {
    if (!DATA_IMAGE.test(s)) return null;
    const bytes = Buffer.from(s.slice(s.indexOf(",") + 1), "base64");
    if (!bytes.length) return null;
    return sha256Hex(bytes) === ERP_PLACEHOLDER_IMAGE_SHA256 ? { placeholder: true } : { url: s };
  }

  // Filesystem paths (C:\…, \\server\…) are never reachable from a browser.
  if (s.includes("\\") || /^[a-z]:/i.test(s)) return null;

  let url: URL;
  try {
    if (/^https?:\/\//i.test(s)) url = new URL(s);
    else if (s.startsWith("//")) url = new URL(`https:${s}`);
    else if (opts.base) url = new URL(s.startsWith("/") ? s : `/${s}`, `${opts.base}/`);
    else return null;
  } catch {
    return null;
  }

  const spaces = url.hostname.match(SPACES_HOST);
  if (spaces) {
    const objectUrl = new URL(url.pathname, `https://${url.host}`);
    if (opts.spaces && isSpacesHostAllowed(url.hostname, opts)) {
      try {
        return { url: presignS3Get(objectUrl, opts.spaces, spaces[2], opts.now ?? new Date()) };
      } catch {
        return { url: objectUrl.toString() }; // malformed %-escape in the key
      }
    }
    return { url: objectUrl.toString() };
  }
  return { url: url.toString() };
}

/**
 * Hosts the admin UI may load ERP images from — must match images.remotePatterns in
 * next.config.ts (next/image refuses anything else): ERP_IMAGE_SPACES_HOSTS + ERP_IMAGE_BASE.
 * Also bounds which hosts the server-side check will ever contact.
 */
export function isAllowedImageUrl(url: string, opts: Pick<ImageResolveOptions, "base" | "spacesHosts"> = {}): boolean {
  if (url.startsWith("data:")) return true;
  try {
    const u = new URL(url);
    if (u.protocol === "https:" && u.origin === BARCODE_IMAGE_ORIGIN && BARCODE_IMAGE_PATH.test(u.pathname)) return true;
    if (u.protocol === "https:" && isSpacesHostAllowed(u.hostname, opts)) return true;
    if (!opts.base) return false;
    const b = new URL(opts.base);
    return u.protocol === b.protocol && u.host === b.host;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------------------
 * AWS Signature V4 query-string presigning (S3-compatible; DigitalOcean Spaces).
 * ------------------------------------------------------------------------- */
const rfc3986 = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();
const amzDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * Presigned GET URL. The signing time is floored to the hour so the URL stays identical
 * for an hour (lets browser and next/image caches hit); it remains valid for at least an hour.
 * Only `host` is signed, so the URL also accepts extra headers such as Range.
 */
export function presignS3Get(objectUrl: URL, creds: SpacesCredentials, region: string, now: Date, expiresSeconds?: number, floorToHour = true): string {
  const at = floorToHour ? new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000) : now;
  const expires = expiresSeconds ?? (floorToHour ? 7200 : 3600);
  const date = amzDate(at);
  const day = date.slice(0, 8);
  const scope = `${day}/${region}/s3/aws4_request`;
  const path = objectUrl.pathname
    .split("/")
    .map((seg) => rfc3986(decodeURIComponent(seg)))
    .join("/");
  const query = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${creds.accessKeyId}/${scope}`],
    ["X-Amz-Date", date],
    ["X-Amz-Expires", String(expires)],
    ["X-Amz-SignedHeaders", "host"],
  ]
    .map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`)
    .join("&");
  const canonicalRequest = ["GET", path, query, `host:${objectUrl.host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", date, scope, sha256Hex(canonicalRequest)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${creds.secretAccessKey}`, day), region), "s3"), "aws4_request");
  const signature = createHmac("sha256", key).update(stringToSign).digest("hex");
  return `${objectUrl.origin}${path}?${query}&X-Amz-Signature=${signature}`;
}

/* ---------------------------------------------------------------------------
 * Availability check — one ranged GET per image, answers cached.
 * GET (not HEAD) because presigned URLs are only valid for the method they were signed for.
 * ------------------------------------------------------------------------- */
type ProbeEntry = { ok: boolean; at: number };
type ProbeState = { cache: Map<string, ProbeEntry>; inflight: Map<string, Promise<boolean | null>>; hostDownUntil: Map<string, number> };
const g = globalThis as unknown as { __erpImageProbe?: ProbeState };
const state: ProbeState = g.__erpImageProbe?.inflight ? g.__erpImageProbe : (g.__erpImageProbe = { cache: new Map(), inflight: new Map(), hostDownUntil: new Map() });
const OK_TTL = 6 * 3_600_000;
const FAIL_TTL = 15 * 60_000;
const HOST_DOWN_MS = 60_000;
const MAX_ENTRIES = 50_000;
const PROBE_TIMEOUT_MS = 4000;

/** Signed URLs change every hour; cache by the object URL instead. */
const probeKey = (url: string) => (url.includes("X-Amz-Signature=") ? url.split("?")[0] : url);

/** true = loads as an image, false = definitely not (403/404/…), null = could not tell (network, 429, 5xx). */
export function probeImage(url: string, fetchImpl: typeof fetch = fetch): Promise<boolean | null> {
  if (url.startsWith("data:")) return Promise.resolve(true);
  const key = probeKey(url);
  const hit = state.cache.get(key);
  if (hit && Date.now() - hit.at < (hit.ok ? OK_TTL : FAIL_TTL)) return Promise.resolve(hit.ok);
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    return Promise.resolve(false);
  }
  if ((state.hostDownUntil.get(host) ?? 0) > Date.now()) return Promise.resolve(null);
  const pending = state.inflight.get(key);
  if (pending) return pending;

  const run = (async (): Promise<boolean | null> => {
    let res: Response;
    try {
      res = await fetchImpl(url, { method: "GET", headers: { Range: "bytes=0-0" }, cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    } catch {
      state.hostDownUntil.set(host, Date.now() + HOST_DOWN_MS); // stop waiting on a host that hangs or does not resolve
      return null;
    }
    res.body?.cancel().catch(() => {});
    if (res.status === 429 || res.status >= 500) return null; // transient: let the browser try, re-check next time
    const ok = (res.status === 200 || res.status === 206) && (res.headers.get("content-type") ?? "image/").toLowerCase().startsWith("image/");
    if (state.cache.size >= MAX_ENTRIES) state.cache.clear();
    state.cache.set(key, { ok, at: Date.now() });
    return ok;
  })().finally(() => state.inflight.delete(key));
  state.inflight.set(key, run);
  return run;
}

export interface ResolvedImage {
  image?: string;
  imageIssue?: ImageIssue;
}

/** Stored references -> loadable candidates (allowed hosts only), in priority order. */
function candidates(refs: unknown[], opts: ImageResolveOptions): { urls: string[]; sawPlaceholder: boolean; sawDisallowed: boolean } {
  const urls: string[] = [];
  const seenUrls = new Set<string>();
  let sawPlaceholder = false;
  let sawDisallowed = false;
  for (const ref of refs) {
    const n = normalizeImageRef(ref, opts);
    if (!n) continue;
    if ("placeholder" in n) sawPlaceholder = true;
    else if (isAllowedImageUrl(n.url, opts)) {
      const sourceUrl = new URL(n.url);
      const barcodeImage = sourceUrl.pathname.match(/^\/august_8A_images\/([a-z0-9_-]+\.(?:jpe?g|png|webp))$/i);
      if (barcodeImage && sourceUrl.origin !== BARCODE_IMAGE_ORIGIN) {
        for (const host of opts.spacesHosts ?? []) {
          const spacesImage = normalizeImageRef(
            `https://${host}/1/1/barcodes/${barcodeImage[1]}`,
            opts,
          );
          if (spacesImage && "url" in spacesImage && !seenUrls.has(spacesImage.url)) {
            urls.push(spacesImage.url);
            seenUrls.add(spacesImage.url);
          }
        }
      }
      if (!seenUrls.has(n.url)) {
        urls.push(n.url);
        seenUrls.add(n.url);
      }
    } else sawDisallowed = true; // e.g. http://wovenessencemobile.etpl.ai — host no longer resolves
  }
  return { urls, sawPlaceholder, sawDisallowed };
}

/**
 * Stored references of ONE record (in priority order) -> the first one that loads.
 * Never looks at any other record, so an image can only ever belong to its own barcode.
 * `deadlineAt` (epoch ms, shared by a whole page) caps the wait: past it the first candidate is
 * returned unchecked (the UI falls back if it fails) while the check carries on in the background
 * and fills the cache.
 */
export async function resolveRecordImage(refs: unknown[], opts: ImageResolveOptions, fetchImpl?: typeof fetch, deadlineAt?: number): Promise<ResolvedImage> {
  const { urls, sawPlaceholder, sawDisallowed } = candidates(refs, opts);
  if (!urls.length) return { imageIssue: sawDisallowed ? "unavailable" : sawPlaceholder ? "placeholder" : "none" };

  const check = async (): Promise<ResolvedImage> => {
    let unknown: string | undefined;
    for (const url of urls) {
      const ok = await probeImage(url, fetchImpl);
      if (ok) return { image: url };
      if (ok === null) unknown ??= url;
    }
    // Could not reach the host: hand the URL to the browser; the UI falls back on error.
    return unknown ? { image: unknown } : { imageIssue: "unavailable" };
  };
  if (deadlineAt == null) return check();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<ResolvedImage>((resolve) => (timer = setTimeout(() => resolve({ image: urls[0] }), Math.max(0, deadlineAt - Date.now()))));
  try {
    return await Promise.race([check(), late]);
  } finally {
    clearTimeout(timer);
  }
}

/** Run `fn` over items with at most `limit` in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
