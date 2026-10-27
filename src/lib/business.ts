import type { SiteSettings } from "@/repositories/web/site.repository";

const DEFAULT_ADDRESS = "1ST FLOOR 4T, BLOCK 34, 27th Cross, 4th T Block East, 4th Block, Jayanagar, Bengaluru, Karnataka 560011";
const DEFAULT_PHONE = "099163 11500";
const DEFAULT_EMAIL = "hello@wovenessence.in";
const DEFAULT_HOURS = "Mon–Sat, 10:30 am – 8:30 pm";
const DEFAULT_INSTAGRAM = "https://www.instagram.com/templefabrics?vrfl=eXoyOXo5MzQyamNu";

/** Seeded placeholders that older settings rows may still hold; they resolve to the real store details. */
const PLACEHOLDER_ADDRESSES = new Set([
  "Temple Fabrics, 12 Commercial Street, Shivaji Nagar, Bengaluru 560001",
  "1st & 2nd Floor, SRS Complex, 2611, 27th Main Rd, above Kushal's, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102",
]);

export interface BusinessInfo {
  address: string;
  phone: string;
  email: string;
  hours: string;
  instagram: string;
  facebook?: string;
  youtube?: string;
}

/** Store contact details for the footer and structured data, with the seeded placeholders replaced. */
export function businessInfo(settings: Pick<SiteSettings, "contact" | "social">): BusinessInfo {
  const contact = settings.contact;
  const address = contact?.address && !PLACEHOLDER_ADDRESSES.has(contact.address) ? contact.address : DEFAULT_ADDRESS;
  const phone = contact?.phone && contact.phone !== "+91 80 4000 0000" ? contact.phone : DEFAULT_PHONE;
  const instagram = settings.social?.instagram && settings.social.instagram !== "https://instagram.com/wovenessence" ? settings.social.instagram : DEFAULT_INSTAGRAM;
  return {
    address,
    phone,
    email: contact?.email || DEFAULT_EMAIL,
    hours: contact?.hours || DEFAULT_HOURS,
    instagram,
    facebook: settings.social?.facebook || undefined,
    youtube: settings.social?.youtube || undefined,
  };
}

/** "099163 11500" → "+919916311500" (E.164, India). */
export function e164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return `+91${local}`;
}
