/**
 * Centralized product image URL resolver.
 *
 * Handles three image path formats from MongoDB:
 * 1. Existing absolute URLs (e.g., https://example.com/product.jpg)
 * 2. ERP uploaded file API paths (e.g., /api/files/c1/c1cfaa7c9297b89e87eb2bfa8d256b700213b34f6cc1b964f3f8fda9e4d58b92.jpg)
 * 3. Server public image paths (e.g., /images/8A/8A3164.jpg)
 *
 * All formats are resolved to their correct server origins and returned as loadable URLs.
 */

import { env } from "./env";

/**
 * Default fallback image when no image is available or cannot be loaded.
 */
export const DEFAULT_PRODUCT_IMAGE = "/placeholders/photo-unavailable.webp";

/**
 * Resolves a product image path to a loadable URL.
 *
 * @param {string} image - The image value from MongoDB (can be empty, relative, or absolute)
 * @returns {string} A loadable image URL
 */
export function resolveProductImage(image) {
  // Handle null, undefined, or non-string values
  if (!image || typeof image !== "string") {
    return DEFAULT_PRODUCT_IMAGE;
  }

  const value = image.trim();

  // Handle empty string
  if (!value) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  // CASE 1: Existing absolute URL
  // Preserve already-absolute URLs (https:// or http://)
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // CASE 2: ERP uploaded file API path
  // Paths beginning with /api/files/ are served by the ERP server
  if (value.startsWith("/api/files/")) {
    const erpBase = env.ERP_IMAGE_BASE;
    if (erpBase) {
      // Remove trailing slash from base to avoid double slashes
      const baseUrl = erpBase.replace(/\/+$/, "");
      return `${baseUrl}${value}`;
    }
    // If ERP_IMAGE_BASE is not configured, return the path as-is
    // (will likely fail, but matches existing behavior)
    return value;
  }

  // CASE 3: Server public image path
  // Paths beginning with /images/ are served from the ERP server's public directory
  if (value.startsWith("/images/")) {
    const erpBase = env.ERP_IMAGE_BASE;
    if (erpBase) {
      // Remove trailing slash from base to avoid double slashes
      const baseUrl = erpBase.replace(/\/+$/, "");
      return `${baseUrl}${value}`;
    }
    // If ERP_IMAGE_BASE is not configured, return the path as-is
    return value;
  }

  // CASE 4: Other relative paths
  // For backward compatibility, resolve other relative paths against ERP_IMAGE_BASE
  // This handles legacy formats like /august_8A_images/...
  const erpBase = env.ERP_IMAGE_BASE;
  if (erpBase) {
    const baseUrl = erpBase.replace(/\/+$/, "");
    // Ensure the path starts with /
    const normalizedPath = value.startsWith("/") ? value : `/${value}`;
    return `${baseUrl}${normalizedPath}`;
  }

  // If no base is configured and the path is not absolute, return as-is
  // (will likely fail, but this is a configuration issue)
  return value;
}

/**
 * Checks if an image source is a remote URL (not local).
 * Used to determine if Next.js Image should use unoptimized mode.
 *
 * @param {string} src - The image source URL
 * @returns {boolean} True if the image is from a remote origin
 */
export function isRemoteImageSource(src) {
  if (!src || typeof src !== "string") return false;
  return /^(?:https?:)?\/\//i.test(src);
}
