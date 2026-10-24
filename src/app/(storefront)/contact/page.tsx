import type { Metadata } from "next";
import { getSettings } from "@/lib/site-data";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ContactForm } from "@/components/account/contact-form";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage() {
  const s = await getSettings();
  const contactEmail = s.contact?.email || "hello@wovenessence.in";
  const contactHours = s.contact?.hours || "Mon–Sat, 10:30 am – 8:30 pm";

  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <div className="mt-4 grid gap-10 md:grid-cols-2">
        <div>
          <h1 className="we-rule text-4xl">Talk to us</h1>
          <div className="mt-6 space-y-2 text-sm text-ink/80">
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
