"use client";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Trash button shared by the bag drawer and the View Bag page. */
export function RemoveLineButton({
  sku,
  onRemove,
  disabled,
  className,
}: {
  sku: string;
  onRemove: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={disabled}
      aria-label={`Remove CODE ${sku} from bag`}
      title={`Remove CODE ${sku} from bag`}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-maroon/75 transition-colors hover:bg-maroon/10 hover:text-maroon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 focus-visible:ring-offset-ivory disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
