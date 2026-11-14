import { describe, expect, it } from "vitest";

import {
  GALLERY_SLOT_LIMIT,
  GALLERY_VIEWS,
  buildGalleryImages,
  galleryCategory,
  galleryViewLabel,
  galleryViewLabels,
  isAllowedGalleryUrl,
} from "@/lib/product-gallery";

describe("galleryCategory", () => {
  it("maps existing saree category and product-type strings", () => {
    expect(galleryCategory("SAREES")).toBe("saree");
    expect(galleryCategory("saree")).toBe("saree");
    expect(galleryCategory("Banarasi Silk Saree")).toBe("saree");
    expect(galleryCategory("Sari")).toBe("saree");
  });

  it("maps existing fabric category and product-type strings", () => {
    expect(galleryCategory("FABRIC")).toBe("fabric");
    expect(galleryCategory("Plain Fabrics")).toBe("fabric");
    expect(galleryCategory("Dupatta")).toBe("fabric");
    expect(galleryCategory("Unstitched Suits")).toBe("fabric");
  });

  it("maps existing men's wear category and product-type strings", () => {
    expect(galleryCategory("MENS WEAR")).toBe("menswear");
    expect(galleryCategory("Men's Wear")).toBe("menswear");
    expect(galleryCategory("Ready Made")).toBe("menswear");
    expect(galleryCategory("Dhoti")).toBe("menswear");
    expect(galleryCategory("Kurta")).toBe("menswear");
  });

  it("falls back to the default set for unknown or empty values", () => {
    expect(galleryCategory("Jewellery")).toBe("default");
    expect(galleryCategory("")).toBe("default");
    expect(galleryCategory(undefined)).toBe("default");
    expect(galleryCategory(null)).toBe("default");
  });
});

describe("galleryViewLabels", () => {
  it("returns the requested five labels for each gallery category", () => {
    expect(galleryViewLabels("SAREES")).toEqual([
      "Full Drape",
      "Pallu",
      "Border",
      "Texture",
      "Blouse Piece",
    ]);
    expect(galleryViewLabels("FABRIC")).toEqual([
      "Full View",
      "Texture",
      "Pattern",
      "Border",
      "Folded View",
    ]);
    expect(galleryViewLabels("MENS WEAR")).toEqual([
      "Front",
      "Side",
      "Back",
      "Detail",
      "Styling",
    ]);
    expect(galleryViewLabels("Unknown")).toEqual(GALLERY_VIEWS.default);
  });

  it("labels one gallery position and falls back for extra positions", () => {
    expect(galleryViewLabel(0, "SAREES")).toBe("Full Drape");
    expect(galleryViewLabel(4, "SAREES")).toBe("Blouse Piece");
    expect(galleryViewLabel(5, "SAREES")).toBe("View 6");
    expect(galleryViewLabel(0, undefined)).toBe("Main View");
  });
});

describe("buildGalleryImages", () => {
  const base = "https://cdn.example.com/erp-primary.jpg";

  it("keeps single-image products on the existing ERP image", () => {
    expect(buildGalleryImages(undefined, undefined, base)).toEqual([base]);
    expect(buildGalleryImages("", [], base)).toEqual([base]);
    expect(buildGalleryImages(null, null, base)).toEqual([base]);
  });

  it("prefers a saved primary override over the ERP image", () => {
    expect(buildGalleryImages("https://cdn.example.com/custom.jpg", [], base)).toEqual([
      "https://cdn.example.com/custom.jpg",
    ]);
  });

  it("returns extras in order after the primary image", () => {
    expect(
      buildGalleryImages(undefined, [
        "https://cdn.example.com/side.jpg",
        "https://cdn.example.com/back.jpg",
      ], base),
    ).toEqual([
      base,
      "https://cdn.example.com/side.jpg",
      "https://cdn.example.com/back.jpg",
    ]);
  });

  it("de-duplicates repeated images across primary, extras and base", () => {
    expect(
      buildGalleryImages(
        base,
        [
          base,
          "https://cdn.example.com/detail.jpg",
          " https://cdn.example.com/detail.jpg ",
          "",
          null,
          42,
        ],
        base,
      ),
    ).toEqual([base, "https://cdn.example.com/detail.jpg"]);
  });

  it("caps the gallery at five images", () => {
    const extras = Array.from({ length: 8 }, (_, index) => `https://cdn.example.com/${index}.jpg`);
    expect(buildGalleryImages(undefined, extras, base)).toHaveLength(5);
    expect(buildGalleryImages(undefined, extras, base, 3)).toEqual([
      base,
      "https://cdn.example.com/0.jpg",
      "https://cdn.example.com/1.jpg",
    ]);
  });

  it("returns an empty gallery when there is no image at all", () => {
    expect(buildGalleryImages(undefined, undefined)).toEqual([]);
    expect(buildGalleryImages("", ["", "   "], null)).toEqual([]);
  });
});

describe("isAllowedGalleryUrl", () => {
  it("accepts public http(s) and site-relative image paths", () => {
    expect(isAllowedGalleryUrl("https://erp.wovenessence.in/images/4A/4A1287.jpg")).toBe(true);
    expect(isAllowedGalleryUrl("http://cdn.example.com/a.webp")).toBe(true);
    expect(isAllowedGalleryUrl("/api/v1/uploads/products/4a1277/one.jpg")).toBe(true);
    expect(isAllowedGalleryUrl("  https://cdn.example.com/a.jpg  ")).toBe(true);
  });

  it("rejects executable, inline, protocol-relative and malformed values", () => {
    expect(isAllowedGalleryUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedGalleryUrl("data:image/svg+xml,<svg/>")).toBe(false);
    expect(isAllowedGalleryUrl("//evil.example.com/a.jpg")).toBe(false);
    expect(isAllowedGalleryUrl("/\\evil.example.com/a.jpg")).toBe(false);
    expect(isAllowedGalleryUrl("not a url")).toBe(false);
    expect(isAllowedGalleryUrl("")).toBe(false);
  });

  it("keeps the documented five-image limit", () => {
    expect(GALLERY_SLOT_LIMIT).toBe(5);
  });
});
