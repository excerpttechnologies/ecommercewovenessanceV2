export function AnnouncementBar({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <div className="bg-olive text-ivory">
      <div className="mx-auto flex max-w-site items-center justify-center gap-8 overflow-hidden px-4 py-1.5 text-[11px] uppercase tracking-[0.2em]">
        {messages.map((m, i) => (
          <span key={i} className="whitespace-nowrap">{m}</span>
        ))}
      </div>
    </div>
  );
}
