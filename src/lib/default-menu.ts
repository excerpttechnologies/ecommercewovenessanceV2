import type { MenuNode } from "@/repositories/web/site.repository";

/** "By Weave" -> weave, "By Colour" -> color: the query keys the ERP collection pages filter on. */
function filterKeyFor(label: string): string {
  const key = label.replace(/^by\s+/i, "").trim().toLowerCase();
  return key === "colour" ? "color" : key;
}

function group(id: string, label: string, values: string[], href: string): MenuNode {
  const key = filterKeyFor(label);
  return {
    id,
    label,
    kind: "group",
    children: values.map((value, index) => ({
      id: `${id}-${index + 1}`,
      label: value,
      kind: "link",
      href: `${href}?${key}=${encodeURIComponent(value)}`,
      children: [],
    })),
  };
}

const sareesHref = "/collections/sarees";
const fabricsHref = "/collections/fabrics";

export const DEFAULT_MENU: MenuNode[] = [
  {
    id: "default-sarees",
    label: "SAREES",
    kind: "top",
    href: sareesHref,
    children: [
      group("default-sarees-weave", "By Weave", [
        "Brocade", "Crepe", "Double Ikat", "Handloom", "Jacquard", "Jamdani",
        "Kadwa", "Korvai", "Kuppadam", "Plain Weave", "Single Ikat", "Tissue",
      ], sareesHref),
      group("default-sarees-fabric", "By Fabric", [
        "Banarasi Silk Sarees", "Chanderi Sarees", "Cotton Sarees", "Gadwal Silk Sarees",
        "Georgette Sarees", "Kanchipuram Silk Sarees", "Linen Sarees", "Mysore Silk Sarees",
        "Organza Sarees", "Paithani Silk Sarees", "Patola Silk Sarees", "Tussar Silk Sarees",
      ], sareesHref),
      group("default-sarees-craft", "By Craft", [
        "Bandhani", "Block Print", "Cutwork", "Hand Embroidery", "Jamdani", "Kalamkari",
        "Meenakari", "Zari",
      ], sareesHref),
      group("default-sarees-occasion", "By Occasion", [
        "Bridal", "Casual", "Festive", "Office", "Party", "Pooja", "Wedding",
      ], sareesHref),
    ],
  },
  {
    id: "default-fabrics",
    label: "FABRICS",
    kind: "top",
    href: fabricsHref,
    children: [
      group("default-fabrics-fabric", "By Fabric", [
        "Banarasi Silk Fabric", "Chanderi Fabric", "Cotton Fabric", "Georgette Fabric",
        "Kanchipuram Silk Fabric", "Linen Fabric", "Mysore Silk Fabric", "Organza Fabric",
        "Patola Silk Fabric", "Paithani Silk Fabric", "Tussar Silk Fabric",
      ], fabricsHref),
      group("default-fabrics-colour", "By Colour", [
        "Beige", "Black", "Gold", "Ivory", "Lavender", "Maroon", "Mustard", "Orange",
        "Pink", "Purple", "Royal Blue", "Teal",
      ], fabricsHref),
    ],
  },
  {
    id: "default-plain-fabrics",
    label: "PLAIN FABRICS",
    kind: "top",
    href: "/collections/plain-fabrics",
    children: [
      group("default-plain-fabrics-fabric", "By Fabric", [
        "Plain Chanderi", "Plain Cotton", "Plain Gadwal Silk", "Plain Kanchipuram Silk",
        "Plain Linen", "Plain Mysore Silk", "Plain Patola Silk", "Plain Tussar Silk",
      ], "/collections/plain-fabrics"),
      group("default-plain-fabrics-colour", "By Colour", [
        "Beige", "Black", "Bottle Green", "Emerald Green", "Gold", "Ivory", "Lavender",
        "Maroon", "Orange", "Pink", "Red", "Teal",
      ], "/collections/plain-fabrics"),
    ],
  },
  {
    id: "default-dupatta",
    label: "DUPATTA",
    kind: "top",
    href: "/collections/dupatta",
    children: [
      group("default-dupatta-fabric", "By Fabric", [
        "Chanderi Dupatta", "Gadwal Silk Dupatta", "Georgette Dupatta",
        "Kanchipuram Silk Dupatta", "Organza Dupatta", "Paithani Silk Dupatta",
        "Patola Silk Dupatta", "Tussar Silk Dupatta",
      ], "/collections/dupatta"),
      group("default-dupatta-colour", "By Colour", [
        "Beige", "Black", "Bottle Green", "Gold", "Ivory", "Lavender", "Maroon",
        "Purple", "Red", "Royal Blue",
      ], "/collections/dupatta"),
    ],
  },
  { id: "default-simple", label: "SIMPLE", kind: "top", href: "/collections/simple", children: [] },
  { id: "default-new-arrivals", label: "NEW ARRIVALS", kind: "top", href: "/collections/sarees?sort=newest", badge: "New", children: [] },
];
