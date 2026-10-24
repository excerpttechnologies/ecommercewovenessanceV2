import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import { getSettings, getStores } from "@/lib/site-data";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "Store locator" };
const JAYANAGAR_ADDRESS = "1ST FLOOR 4T, BLOCK 34, 27th Cross, 4th T Block East, 4th Block, Jayanagar, Bengaluru, Karnataka 560011";

export default async function StoresPage() {
  const [stores, settings] = await Promise.all([getStores().catch(() => []), getSettings().catch(() => null)]);
  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Stores" }]} />
      <h1 className="we-rule mt-4 text-4xl">Visit us</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">Drape before you decide. Our stores carry the full range, plus weaves that never make it online.</p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {stores.map((s) => (
          (() => {
            const address = s.name.trim().toLowerCase() === "bangalore urban" ? JAYANAGAR_ADDRESS : s.address;
            return (
              <li key={s.id} className="rounded-sm border border-line bg-white/60 p-6">
                <h2 className="text-2xl">{s.name}</h2>
                <p className="mt-2 flex items-start gap-2 text-sm text-ink/80"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{address}</p>
                {s.phone && <p className="mt-2 flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-gold" /><a href={`tel:${s.phone}`} className="hover:text-maroon">{s.phone}</a></p>}
                {settings?.contact?.hours && <p className="mt-2 text-xs text-muted">{settings.contact.hours}</p>}
                <div className="mt-4 flex gap-3 text-xs uppercase tracking-widest">
                  <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${address}`)}`} target="_blank" rel="noreferrer" className="text-maroon underline-offset-4 hover:underline">Directions</a>
                  {settings?.whatsappNumber && <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className="text-olive underline-offset-4 hover:underline">WhatsApp</a>}
                </div>
              </li>
            );
          })()
        ))}
        {stores.length === 0 && <li className="text-sm text-muted">Store details are temporarily unavailable. Please try again shortly or <a href="/contact" className="text-maroon underline underline-offset-2">contact us</a>.</li>}
      </ul>
    </div>
  );
}
