"use client";
import { ImageGallery } from "./image-gallery";

export function Gallery({ images, alt, badge }: { images: string[]; alt: string; badge?: string }) {
  return <ImageGallery images={images.map((src) => ({ src }))} alt={alt} badge={badge} mainAspectClassName="aspect-[3/4]" />;
}
