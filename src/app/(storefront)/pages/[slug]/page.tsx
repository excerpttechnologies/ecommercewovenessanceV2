import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSite } from "@/repositories";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Markdown } from "@/components/ui/markdown";
import { OG_DEFAULTS } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getSite().page((await params).slug);
  if (!p) return {};
  const title = p.seoTitle ?? p.title;
  const description = p.seoDescription ?? p.excerpt ?? `${p.title} – Woven Essence by Temple Fabrics, Bengaluru.`;
  return {
    title,
    description,
    alternates: { canonical: `/pages/${p.slug}` },
    openGraph: { ...OG_DEFAULTS, type: "article", url: `/pages/${p.slug}`, title, description },
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getSite().page((await params).slug);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: p.title }]} />
      <h1 className="mt-4 text-4xl font-bold">{p.title}</h1>
      {p.excerpt && <p className="mt-3 text-sm text-muted">{p.excerpt}</p>}
      <Markdown className="mt-8" source={p.body ?? ""} />
    </div>
  );
}
