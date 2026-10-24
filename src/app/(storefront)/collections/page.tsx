import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSite } from "@/repositories";
import { getCategoryTree } from "@/lib/site-data";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "All Collections" };

export default async function CollectionsIndex() {
  const [collections, categories] = await Promise.all([getSite().collections(), getCategoryTree()]);
  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Collections" }]} />
      <h1 className="we-rule mt-4 text-4xl">Collections</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, image: c.image, description: `${c.children.length} sub-categories` })), ...collections.map((c) => ({ id: String(c._id), slug: c.slug, name: c.name, image: c.banner?.desktop, description: c.description }))].map((c) => (
          <Link key={c.id} href={`/collections/${c.slug}`} className="group relative block overflow-hidden rounded-sm bg-line">
            <div className="relative aspect-[16/9]">{c.image && <Image src={c.image} alt={c.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}</div>
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 to-transparent p-5 text-ivory">
              <p className="font-heading text-2xl">{c.name}</p>
              {c.description && <p className="line-clamp-1 text-xs text-ivory/80">{c.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
