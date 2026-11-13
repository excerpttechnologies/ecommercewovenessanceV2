import type { Metadata } from "next";
import { getSettings } from "@/lib/site-data";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, pageMetadata, storeJsonLd } from "@/lib/seo";
import { ContactForm } from "@/components/account/contact-form";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description: "Questions about a saree, an order or delivery? Call, email or WhatsApp the Woven Essence team at Temple Fabrics, Jayanagar, Bengaluru.",
  path: "/contact",
});

export default async function ContactPage() {
  const s = await getSettings();
  const contactEmail = s.contact?.email || "hello@wovenessence.in";
  const contactHours = s.contact?.hours || "Mon–Sat, 10:30 am – 8:30 pm";
  const storeName = s.storeName?.trim() || "Woven Essence";
  const legalName = s.legalName?.trim();
  const businessName = legalName && legalName !== storeName ? `${storeName} by ${legalName}` : storeName;

  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      {s && <JsonLd nodes={[storeJsonLd(s), breadcrumbJsonLd([{ name: "Contact", path: "/contact" }])]} />}
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <div className="mt-4 grid gap-10 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold">Talk to us</h1>
          <p className="mt-2 text-sm font-semibold text-olive">{businessName}</p>
          <div className="mt-5 space-y-2 text-sm text-ink/80">
            {s.contact?.address && <p>{s.contact.address}</p>}
            {s.contact?.phone && <p><a href={`tel:${s.contact.phone}`} className="hover:text-maroon">{s.contact.phone}</a></p>}
            <p><a href={`mailto:${contactEmail}`} className="hover:text-maroon">{contactEmail}</a></p>
            <p className="text-muted">{contactHours}</p>
            {s.whatsappNumber && <p><a href={`https://wa.me/${s.whatsappNumber}`} target="_blank" rel="noreferrer" className="text-olive underline underline-offset-4">Chat on WhatsApp</a></p>}
          </div>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
