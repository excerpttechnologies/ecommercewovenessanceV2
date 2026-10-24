import { MessageCircle } from "lucide-react";

export function WhatsAppFloat({ number, text = "Hi! I'd like to know more about your sarees." }: { number?: string | null; text?: string }) {
  if (!number) return null;
  const href = `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
