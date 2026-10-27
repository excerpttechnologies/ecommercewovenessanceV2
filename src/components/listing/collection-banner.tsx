import Image from "next/image";
import { isRemoteImageSource } from "@/lib/utils";

/** Listing page header: soft pink panel, big title, optional description and image on the right. */
export function CollectionBanner({ title, description, image }: { title: string; description?: string | null; image?: string | null }) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-r from-maroon/15 via-maroon/[0.07] to-amber-100/60">
      {image && (
        <div className="absolute inset-y-0 right-0 w-1/2 sm:w-2/5">
          <Image src={image} alt="" fill priority unoptimized={isRemoteImageSource(image)} sizes="40vw" className="object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fbe6ef] via-[#fbe6ef]/40 to-transparent" />
        </div>
      )}
      <div className="relative max-w-xl px-6 py-8 sm:px-10 sm:py-12">
        <h1 className="text-3xl font-bold sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 text-sm text-ink/80 sm:text-base">{description}</p>}
      </div>
    </div>
  );
}
