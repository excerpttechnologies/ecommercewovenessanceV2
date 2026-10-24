"use client";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Drawer({ open, onClose, title, children, side = "right", className }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; side?: "left" | "right"; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div className={cn("fixed inset-0 z-[60]", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div onClick={onClose} className={cn("absolute inset-0 bg-ink/40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute top-0 flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl transition-transform duration-300",
          side === "right" ? "right-0" : "left-0",
          open ? "translate-x-0" : side === "right" ? "translate-x-full" : "-translate-x-full",
          className,
        )}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-olive/10">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
