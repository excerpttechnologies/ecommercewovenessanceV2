import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { CustomerCareInfo } from "@/lib/product-info";
import { WhatsAppContactButton } from "./whatsapp-contact-button";

/**
 * Phone, WhatsApp and email support. Only configured contact details are
 * rendered — an inactive or placeholder contact is never shown.
 */
export function CustomerCareTab({ info, productName }: { info: CustomerCareInfo; productName: string }) {
  const hasContact = Boolean(info.phone || info.whatsappNumber || info.email);

  return (
    <div className="max-w-4xl">
      <h3 className="font-display text-2xl font-semibold text-olive">Customer Care</h3>
      <p className="mt-2 text-ink/80">
        We are happy to help with fabric details, measurements, delivery or an order you have already placed.
        Reach the {info.storeName} team through whichever channel suits you.
      </p>

      {hasContact ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {info.phone && info.phoneHref && (
            <div className="flex flex-col rounded-lg border border-line bg-white p-4">
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <Phone className="h-4 w-4" aria-hidden /> Phone support
              </span>
              <a href={info.phoneHref} className="mt-2 text-lg font-medium text-olive hover:text-maroon">
                {info.phone}
              </a>
              <a
                href={info.phoneHref}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-olive/20 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-olive hover:border-olive"
              >
                Call now
              </a>
            </div>
          )}

          {info.whatsappNumber && (
            <div className="flex flex-col rounded-lg border border-line bg-white p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">WhatsApp support</span>
              <p className="mt-2 text-sm text-ink/80">Chat with our {info.storeName} team.</p>
              <div className="mt-3">
                <WhatsAppContactButton number={info.whatsappNumber} productName={productName} />
              </div>
            </div>
          )}

          {info.email && info.emailHref && (
            <div className="flex flex-col rounded-lg border border-line bg-white p-4">
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <Mail className="h-4 w-4" aria-hidden /> Email support
              </span>
              <a href={info.emailHref} className="mt-2 break-words text-[15px] font-medium text-olive hover:text-maroon">
                {info.email}
              </a>
              <a
                href={info.emailHref}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-olive/20 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-olive hover:border-olive"
              >
                Send email
              </a>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-line bg-ivory px-4 py-3 text-ink/80">
          Our phone and WhatsApp details are being updated. You can still reach us through the{" "}
          <Link href="/contact" className="text-maroon underline underline-offset-2">
            contact page
          </Link>
          .
        </p>
      )}

      {(info.workingHours || info.address) && (
        <dl className="mt-6 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
          {info.workingHours && (
            <div className="flex gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted">Working hours</dt>
                <dd className="mt-0.5 text-ink/85">{info.workingHours}</dd>
              </div>
            </div>
          )}
          {info.address && (
            <div className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted">Studio address</dt>
                <dd className="mt-0.5 whitespace-pre-line text-ink/85">{info.address}</dd>
              </div>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
