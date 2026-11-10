import { WhatsAppIcon } from "@/components/layout/whatsapp-float";
import { buildWhatsAppUrl, customerEnquiryMessage } from "@/lib/product-info";
import { cn } from "@/lib/utils";

/** Functional WhatsApp button: wa.me deep link with a pre-filled product enquiry. */
export function WhatsAppContactButton({
  number,
  productName,
  label = "Chat With Us on WhatsApp",
  className,
}: {
  number?: string | null;
  productName?: string | null;
  label?: string;
  className?: string;
}) {
  const href = buildWhatsAppUrl(number ?? undefined, customerEnquiryMessage(productName));
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#128C7E]",
        className,
      )}
    >
      <WhatsAppIcon className="h-4 w-4" />
      {label}
    </a>
  );
}
