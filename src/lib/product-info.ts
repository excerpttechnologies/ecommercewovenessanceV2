/**
 * Storefront product-information content.
 *
 * Everything the five product tabs show is derived from admin-managed site
 * settings or from the product itself — no phone number, email address,
 * WhatsApp number or business policy is hardcoded here.
 */

/** The schema placeholder for `whatsappNumber`; treated as "not configured". */
const PLACEHOLDER_WHATSAPP = "919999999999";

/** Country the goods are dispatched from (used in the product overview). */
export const COUNTRY_OF_ORIGIN = "India";

/** Default pre-filled WhatsApp enquiry. */
export const DEFAULT_WHATSAPP_MESSAGE =
  "Hello Woven Essence Team, I need assistance regarding your products. Could you please help me?";

export interface ContactGroup {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hours?: string | null;
}

export interface CustomerCareSettingsInput {
  storeName?: string | null;
  whatsappNumber?: string | null;
  contact?: ContactGroup | null;
}

export interface CustomerCareInfo {
  storeName: string;
  phone?: string;
  phoneHref?: string;
  whatsappNumber?: string;
  email?: string;
  emailHref?: string;
  workingHours?: string;
  address?: string;
}

export interface ShippingReturnsSettingsInput {
  commerce?: {
    freeShippingAbove?: number | null;
    shippingCharge?: number | null;
    codEnabled?: boolean | null;
    processingDays?: number | null;
    returnWindowDays?: number | null;
  } | null;
  shipping?: { codExtraCharge?: number | null } | null;
  contact?: ContactGroup | null;
}

export interface ShippingReturnsInfo {
  processing: string;
  availability: string;
  delivery: string;
  international: string;
  charges: string;
  returnEligibility: string;
  exchange: string;
  refunds: string;
  damaged: string;
  howToRequest: string;
}

export interface CareInfo {
  /** "Silk Care" for silk, "Fabric Care" for every other material. */
  heading: string;
  intro: string;
  items: string[];
  isSilk: boolean;
}

const clean = (value?: string | null): string | undefined => {
  const text = (value ?? "").trim();
  return text || undefined;
};

const number = (value: unknown, fallback: number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const rupees = (value: number): string => `₹${value.toLocaleString("en-IN")}`;

export const digitsOnly = (value?: string | null): string => (value ?? "").replace(/\D/g, "");

/** Best-effort E.164-ish tel: link; Indian numbers get +91 when the prefix is missing. */
export function phoneHref(value?: string | null): string | undefined {
  const raw = clean(value);
  if (!raw) return undefined;
  const digits = digitsOnly(raw);
  if (!digits) return undefined;
  if (raw.startsWith("+")) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `tel:+91${digits.slice(1)}`;
  return `tel:+${digits}`;
}

/** Human-friendly display, e.g. "+91 98765 43210"; anything else is shown as configured. */
export function displayPhone(value?: string | null): string | undefined {
  const raw = clean(value);
  if (!raw) return undefined;
  const digits = digitsOnly(raw);
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 10 ? digits : "";
  if (local) return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  return raw;
}

/** Configured WhatsApp number as digits, or undefined for blank/placeholder values. */
export function whatsAppNumber(value?: string | null): string | undefined {
  const digits = digitsOnly(value);
  if (digits.length < 10 || digits === PLACEHOLDER_WHATSAPP) return undefined;
  // A bare 10-digit Indian mobile still needs the country code for wa.me links.
  return digits.length === 10 ? `91${digits}` : digits;
}

export function buildWhatsAppUrl(value: string | undefined, message: string): string | undefined {
  const digits = digitsOnly(value);
  if (!digits) return undefined;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Product-aware version of the default enquiry message. */
export function customerEnquiryMessage(productName?: string | null): string {
  const name = clean(productName);
  return name
    ? `Hello Woven Essence Team, I need assistance regarding "${name}". Could you please help me?`
    : DEFAULT_WHATSAPP_MESSAGE;
}

export function customerCareFrom(settings?: CustomerCareSettingsInput | null): CustomerCareInfo {
  const contact = settings?.contact ?? {};
  const phone = displayPhone(contact.phone);
  const email = clean(contact.email);
  return {
    storeName: clean(settings?.storeName) ?? "Woven Essence",
    phone,
    phoneHref: phone ? phoneHref(phone) : undefined,
    whatsappNumber: whatsAppNumber(settings?.whatsappNumber),
    email,
    emailHref: email ? `mailto:${email}` : undefined,
    workingHours: clean(contact.hours),
    address: clean(contact.address),
  };
}

const contactLine = (email?: string) => (email ? `write to ${email}` : "contact our team");

export function shippingReturnsFrom(settings?: ShippingReturnsSettingsInput | null): ShippingReturnsInfo {
  const commerce = settings?.commerce ?? {};
  const freeAbove = number(commerce.freeShippingAbove, 4999);
  const flatCharge = number(commerce.shippingCharge, 149);
  const codExtra = number(settings?.shipping?.codExtraCharge, 0);
  const processingDays = Math.max(1, Math.round(number(commerce.processingDays, 2)));
  const returnDays = Math.max(1, Math.round(number(commerce.returnWindowDays, 7)));
  const email = clean(settings?.contact?.email);
  const codEnabled = commerce.codEnabled !== false;

  const charges = freeAbove > 0
    ? `Orders of ${rupees(freeAbove)} and above ship free across India. Below that, a flat ${rupees(flatCharge)} shipping charge is added at checkout.${
        codEnabled && codExtra > 0 ? ` Cash on delivery, where available, carries an additional ${rupees(codExtra)}.` : ""
      }`
    : `Shipping is free on every order within India.${codEnabled && codExtra > 0 ? ` Cash on delivery, where available, carries an additional ${rupees(codExtra)}.` : ""}`;

  return {
    processing: `Each piece is checked, steamed and packed by hand at our studio within ${processingDays} business ${
      processingDays === 1 ? "day" : "days"
    } of your order. You will receive an email and a WhatsApp update once the parcel leaves us.`,
    availability:
      'We deliver to serviceable pincodes across India. Use the "Check delivery" box on the product page to confirm your pincode before you order, or message our team and we will check it for you.',
    delivery:
      "Domestic parcels usually arrive 3–7 business days after dispatch. Remote pincodes, hill regions and festival weeks can take a little longer; the tracking link in your dispatch message shows the latest estimate.",
    international: `International delivery can be arranged on request. ${contactLine(email)} with the product code and the delivery country, and our team will confirm the available courier, duties and charges before you pay.`,
    charges,
    returnEligibility: `Unused, unwashed pieces with their original tags, packaging and invoice can be returned within ${returnDays} ${
      returnDays === 1 ? "day" : "days"
    } of delivery. Altered, washed, used or customised pieces, and fabrics cut to your length, cannot be returned.`,
    exchange:
      "Exchanges are offered for another piece of equal or higher value, subject to availability. Any price difference is payable or refunded through the original payment method; return shipping may apply.",
    refunds:
      "Once the returned piece reaches us and passes inspection, the refund is initiated within 3 business days. Prepaid orders are refunded to the original payment source, and cash-on-delivery orders are refunded to a bank account you provide.",
    damaged:
      "If a parcel arrives damaged, tampered with or with the wrong piece inside, photograph the parcel and the product and contact us within 48 hours of delivery. We will arrange a replacement or a full refund, including return shipping.",
    howToRequest: `Start a return from Account → Orders, or send your order number and product code to ${contactLine(
      email,
    )}. Our team replies with the pickup details and the return address.`,
  };
}

const SILK_WORDS = [
  "silk", "tussar", "tussah", "kanchipuram", "kanjivaram", "banarasi", "mysore silk",
  "paithani", "patola", "gadwal", "chanderi silk", "raw silk", "mulberry",
];

const hasAny = (haystack: string, words: string[]): boolean => words.some((word) => haystack.includes(word));

/**
 * Fabric-specific care copy. Silk products get the dedicated "Silk Care"
 * section; every other material gets instructions that match the fabric.
 */
export function fabricCareFor(material?: string | null, productName?: string | null): CareInfo {
  const haystack = `${material ?? ""} ${productName ?? ""}`.toLowerCase();

  if (hasAny(haystack, SILK_WORDS)) {
    return {
      heading: "Silk Care",
      isSilk: true,
      intro:
        "Pure silk and zari are strong but delicate. A little care after every wear keeps the sheen, colour and drape intact for generations.",
      items: [
        "Dry clean pure silk sarees and any piece with zari work. For a plain silk piece you may hand wash instead, in cold water with a mild, pH-neutral silk detergent.",
        "Never wring, twist, scrub or brush silk. Do not soak it for long, and never use bleach, stain removers or enzyme detergents.",
        "Rinse in cold water, press gently between two clean towels to remove excess water, then dry flat in the shade. Never tumble dry or hang a wet saree by one edge.",
        "Iron on the lowest silk setting, on the reverse side, with a thin cotton cloth between the iron and the zari. Keep steam away from gold and silver zari.",
        "Fold along the original creases and refold on a slightly different line every few months so the zari does not weaken along a single fold.",
        "Store in a breathable cotton or muslin bag, away from direct sunlight and damp walls. Do not let naphthalene balls or perfume touch the fabric.",
        "Air the saree in shade after a special occasion, and avoid spraying perfume or deodorant directly on the silk.",
      ],
    };
  }

  if (hasAny(haystack, ["chiffon", "georgette"])) {
    return {
      heading: "Fabric Care",
      isSilk: false,
      intro: "Chiffon and georgette are light, fluid weaves; handle them gently and store them loosely to protect the fall and finish.",
      items: [
        "Dry cleaning is recommended for embroidered, embellished or printed pieces. Plain chiffon and georgette can be hand washed in cold water with a mild detergent.",
        "Wash separately for the first few washes — deep shades may release a little colour. Do not bleach, rub or wring.",
        "Squeeze out water gently without twisting, then dry flat in the shade. Do not tumble dry and do not hang while wet.",
        "Iron on low heat on the reverse, or steam lightly. Never press sequins, beads or embroidery directly.",
        "Store on a padded hanger or folded loosely in a cotton bag; avoid sharp hooks, rough zips and long-term compression.",
        "Keep away from prolonged direct sunlight and from moisture to prevent fading and mildew.",
      ],
    };
  }

  if (hasAny(haystack, ["cotton", "khadi", "jamdani", "handloom cotton", "mul cotton"])) {
    return {
      heading: "Fabric Care",
      isSilk: false,
      intro: "Cotton softens and settles beautifully with each wash. Gentle washing and shade drying keep the colour even and the weave strong.",
      items: [
        "Hand wash in cold water with a mild detergent, or use a gentle machine cycle in a laundry bag. Wash deep colours separately for the first few washes.",
        "Do not soak overnight, use bleach or scrub printed and handwoven areas.",
        "Squeeze gently instead of wringing, then dry in the shade. Drying flat keeps handwoven borders and fringes in shape.",
        "Iron on medium heat while the fabric is slightly damp; press embroidery and zari on the reverse.",
        "Fold neatly and store in a dry, ventilated cupboard. A light starch now and then helps retain the body of the fabric.",
        "Keep away from damp shelves, sachets touching the cloth and long exposure to harsh sunlight.",
      ],
    };
  }

  if (hasAny(haystack, ["linen"])) {
    return {
      heading: "Fabric Care",
      isSilk: false,
      intro: "Linen is a strong, breathable fibre with a natural texture. It creases easily, so treat it kindly and iron while damp.",
      items: [
        "Hand wash or use a gentle machine cycle in cold water with a mild detergent. Linen can shrink slightly on the first wash.",
        "Avoid bleach and harsh stain removers; treat spills promptly with a mild soap solution.",
        "Dry in the shade, preferably flat for garments with embroidery, to prevent stretching.",
        "Iron on medium-high heat while the fabric is still slightly damp, on the reverse for embellished pieces.",
        "Store folded in a dry place; avoid hanging heavy linen pieces for long periods.",
        "Air the piece after wearing to keep it fresh and prevent odour from settling in the fibres.",
      ],
    };
  }

  if (hasAny(haystack, ["organza"])) {
    return {
      heading: "Fabric Care",
      isSilk: false,
      intro: "Organza holds its crisp structure with very little handling. Protect its finish and it will keep its shape and sheen.",
      items: [
        "Dry clean organza, especially embroidered, printed or zari-trimmed pieces. Do not machine wash.",
        "Spot clean only with a soft cloth and mild detergent; do not rub, soak or wring.",
        "Dry flat in shade, away from direct heat. Do not tumble dry.",
        "Iron on the lowest setting on the reverse, ideally through a cotton cloth or with light steam.",
        "Store folded or rolled loosely in a cotton bag; avoid sharp folds that can leave permanent creases.",
        "Keep away from moisture, direct sunlight and rough surfaces that can snag the weave.",
      ],
    };
  }

  if (hasAny(haystack, ["crepe"])) {
    return {
      heading: "Fabric Care",
      isSilk: false,
      intro: "Crepe has a textured, matte finish that benefits from gentle handling and low, even heat.",
      items: [
        "Dry clean or hand wash plain crepe in cold water with a mild detergent. Do not machine wash embellished crepe.",
        "Do not wring or twist; roll in a towel to remove water.",
        "Dry flat in the shade, away from direct heat and sunlight.",
        "Iron on low heat on the reverse. Light steam helps remove creases without flattening the texture.",
        "Store hanging or folded loosely, away from dampness and strong sunlight.",
        "Avoid perfume, deodorant and hairspray directly on the fabric.",
      ],
    };
  }

  return {
    heading: "Fabric Care",
    isSilk: false,
    intro: "A few simple habits keep handwoven fabrics looking their best — gentle washing, shade drying and careful storage.",
    items: [
      "Dry cleaning is recommended for embroidered, embellished or zari pieces. Other fabrics can be hand washed in cold water with a mild detergent.",
      "Wash deep colours separately and do not use bleach, harsh stain removers or a hot wash.",
      "Do not wring or twist; squeeze out water gently and dry flat in the shade.",
      "Iron on low to medium heat on the reverse, using a thin cotton cloth over embroidery and metallic thread.",
      "Fold loosely and store in a breathable cotton bag in a dry, ventilated cupboard.",
      "Protect the fabric from damp walls, direct sunlight and prolonged contact with perfume or naphthalene.",
    ],
  };
}

export function isSilkMaterial(material?: string | null, productName?: string | null): boolean {
  return fabricCareFor(material, productName).isSilk;
}
