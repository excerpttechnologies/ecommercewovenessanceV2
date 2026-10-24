import { cn } from "@/lib/utils";

const tones = {
  olive: "bg-olive text-ivory",
  gold: "bg-gold/15 text-gold border border-gold/40",
  maroon: "bg-maroon text-ivory",
  muted: "bg-line text-muted",
  green: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  red: "bg-red-50 text-red-800 border border-red-200",
  amber: "bg-amber-50 text-amber-800 border border-amber-200",
  blue: "bg-sky-50 text-sky-800 border border-sky-200",
};
export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "muted", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest", tones[tone], className)}>{children}</span>;
}
