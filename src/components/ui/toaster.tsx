"use client";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/store/toast";

/** Renders the single global toast. Mounted once in the storefront layout. */
export function Toaster() {
  const toast = useToast((state) => state.toast);
  const dismiss = useToast((state) => state.dismiss);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    setBusy(false);
    setErrorMessage(null);
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;
  const message = errorMessage ?? toast.message;

  const runAction = async () => {
    if (!toast.action || busy) return;
    setBusy(true);
    try {
      await toast.action.onClick();
      dismiss(toast.id);
    } catch (error) {
      setBusy(false);
      setErrorMessage(error instanceof Error && error.message ? error.message : "Could not undo. Please try again.");
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        role="status"
        aria-live="polite"
        className="we-toast-in pointer-events-auto flex min-h-12 w-full max-w-sm items-center gap-3 rounded-lg border border-line bg-ivory px-4 py-2.5 text-sm text-ink shadow-lift"
      >
        <span className="min-w-0 flex-1">{message}</span>
        {toast.action && (
          <button
            type="button"
            onClick={() => void runAction()}
            disabled={busy}
            className="shrink-0 rounded-sm px-2 py-1 text-xs font-semibold uppercase tracking-wider text-maroon transition-colors hover:bg-maroon/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {busy ? "Restoring…" : toast.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss notification"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-maroon/10 hover:text-maroon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
