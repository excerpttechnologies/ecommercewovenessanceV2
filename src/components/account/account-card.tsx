import { cn } from "@/lib/utils";

/** The white, softly shadowed card every account page is built from. */
export const accountCard = "rounded-2xl bg-white shadow-[0_10px_30px_-18px_rgba(122,18,56,0.35)] ring-1 ring-black/[0.04]";

export function AccountCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn(accountCard, "p-5 sm:p-6", className)}>{children}</section>;
}

/** Card heading with a round icon chip, as in the mega menu, and an optional action on the right. */
export function AccountCardTitle({ icon: Icon, title, subtitle, action }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon"><Icon className="h-[18px] w-[18px]" /></span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-tight text-ink sm:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
