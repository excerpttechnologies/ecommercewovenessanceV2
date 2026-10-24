import { cn } from "@/lib/utils";

export function ComingSoonImage({ className, label = "Coming Soon", compact = false }: { className?: string; label?: string; compact?: boolean }) {
  return (
    <div role="img" aria-label={label} className={cn("flex items-center justify-center bg-ivory", className)}>
      <span className={cn("border border-line text-center uppercase text-muted", compact ? "max-w-full break-words px-0.5 py-1 text-[6px] leading-tight tracking-normal" : "px-3 py-2 text-[10px] tracking-[0.18em]")}>{label}</span>
    </div>
  );
}
