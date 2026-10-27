"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AnnouncementItem {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

const CLICK_PAUSE_MS = 8000;

/**
 * Light-pink strip above the header. The items scroll sideways in a loop; the strip stops while the
 * pointer is over it, while something inside has focus (an open store/currency select) and for a few
 * seconds after a click or tap. With reduced motion it is a still, swipeable row.
 */
export function AnnouncementBar({ items }: { items: AnnouncementItem[] }) {
  const [held, setHeld] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!items.length) return null;

  const holdForAWhile = () => {
    setHeld(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHeld(false), CLICK_PAUSE_MS);
  };

  const group = (copy: boolean) => (
    <ul
      className="flex shrink-0 items-center"
      aria-hidden={copy || undefined}
      // The second copy only exists to make the loop seamless; keep it out of tab order and screen readers.
      {...(copy ? { inert: true } : {})}
    >
      {items.map(({ key, icon: Icon, content }) => (
        <li key={key} className="flex items-center gap-1.5 whitespace-nowrap border-r border-olive/15 px-5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-maroon" />
          {content}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="group/bar relative overflow-hidden bg-[#f9d6e3] text-[13px] text-olive"
      onPointerDown={holdForAWhile}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) holdForAWhile(); }}
      aria-label="Store information"
      role="region"
    >
      <div className="we-scroller flex h-9 items-center overflow-x-auto motion-safe:overflow-x-hidden">
        <div className={cn("flex w-max motion-safe:animate-[we-marquee_45s_linear_infinite] group-hover/bar:[animation-play-state:paused]", held && "[animation-play-state:paused]")}>
          {group(false)}
          <div className="hidden motion-safe:flex">{group(true)}</div>
        </div>
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#f9d6e3] to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f9d6e3] to-transparent" />
    </div>
  );
}
