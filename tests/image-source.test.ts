import { describe, expect, it } from "vitest";
import { isRemoteImageSource } from "@/lib/utils";

describe("isRemoteImageSource", () => {
  it("recognises absolute and protocol-relative image URLs", () => {
    expect(isRemoteImageSource("https://images.example/saree.jpg")).toBe(true);
    expect(isRemoteImageSource("http://images.example/saree.jpg")).toBe(true);
    expect(isRemoteImageSource("//images.example/saree.jpg")).toBe(true);
  });

  it("keeps same-site image paths optimized", () => {
    expect(isRemoteImageSource("/category-sarees-cream.webp")).toBe(false);
    expect(isRemoteImageSource("category-sarees-cream.webp")).toBe(false);
  });
});
