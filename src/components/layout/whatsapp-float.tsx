/** WhatsApp glyph: speech bubble with a phone handset. */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden>
      <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 6.9L3 29l6.5-2c1.9 1 4.1 1.6 6.5 1.6 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm0 23.3c-2.1 0-4.1-.6-5.8-1.7l-.4-.2-3.9 1.2 1.2-3.7-.3-.4a10.4 10.4 0 0 1-1.8-5.7C5 10 9.9 5.2 16 5.2S27 10 27 15.8 22.1 26.3 16 26.3Zm6-7.8c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.3-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1.1-2.6c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8 0 1.6 1.2 3.2 1.4 3.4.2.2 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.6-.4Z" />
    </svg>
  );
}

export function WhatsAppFloat({ number, text = "Hi! I'd like to know more about your sarees." }: { number?: string | null; text?: string }) {
  if (!number) return null;
  const href = `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_20px_-8px_rgba(37,211,102,0.8)] transition-transform hover:scale-105"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
