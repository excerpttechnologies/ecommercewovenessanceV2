// // src/lib/new-badge.ts

// /** Products added to the ERP within this many days get an "added X days ago" badge. */
// export const NEW_BADGE_MAX_DAYS = 30;

// /** "Today", "1 day ago", "2 days ago"… from the product's added date; null when missing or too old. */
// export function addedAgoLabel(createdAt?: string, maxDays = NEW_BADGE_MAX_DAYS): string | null {
//   if (!createdAt) return null;
//   const added = new Date(createdAt).getTime();
//   if (!Number.isFinite(added)) return null;
//   const days = Math.floor((Date.now() - added) / 86_400_000);
//   if (days < 0 || days > maxDays) return null;
//   if (days === 0) return "Today";
//   return days === 1 ? "1 day ago" : `${days} days ago`;
// }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// src/lib/new-badge.ts

/** Products added to the ERP within this many days get an "added X days ago" badge. */
export const NEW_BADGE_MAX_DAYS = 10;

/** "Today", "1 day ago", "2 days ago"… from the product's added date; null when missing or too old. */
export function addedAgoLabel(createdAt?: string, maxDays = NEW_BADGE_MAX_DAYS): string | null {
  if (!createdAt) return null;
  const added = new Date(createdAt).getTime();
  if (!Number.isFinite(added)) return null;
  const days = Math.floor((Date.now() - added) / 86_400_000);
  if (days < 0 || days > maxDays) return null;
  if (days === 0) return "Today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}