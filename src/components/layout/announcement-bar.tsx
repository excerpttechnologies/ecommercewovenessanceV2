"use client";

export interface AnnouncementItem {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

/**
 * Light-pink store-information strip.
 *
 * Features:
 * - Supports horizontal swipe scrolling on narrow screens.
 * - Removes duplicate announcement keys.
 */
export function AnnouncementBar({
  items,
}: {
  items: AnnouncementItem[];
}) {
  // Remove duplicate announcement keys.
  const seenKeys = new Set<string>();

  const uniqueItems = items.filter(({ key }) => {
    if (seenKeys.has(key)) return false;

    seenKeys.add(key);
    return true;
  });

  if (!uniqueItems.length) return null;

  return (
    <div
      className="relative overflow-hidden bg-[#f9d6e3] text-[13px] text-olive"
      aria-label="Store information"
      role="region"
    >
      <div className="flex h-9 items-center overflow-x-auto overscroll-x-contain">
        <ul className="flex w-max shrink-0 items-center">
          {uniqueItems.map(({ key, icon: Icon, content }) => (
            <li
              key={key}
              className="flex items-center gap-1.5 whitespace-nowrap border-r border-olive/15 px-5"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-maroon" />
              {content}
            </li>
          ))}
        </ul>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#f9d6e3] to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f9d6e3] to-transparent"
      />
    </div>
  );
}
