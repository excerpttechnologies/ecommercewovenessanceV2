/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * npm run seed
 *
 * Writes ~120 mock products, categories, one store, plus every website-owned
 * collection (menu, banners, collections, CMS, settings, coupons, reviews,
 * admin users/roles) into MONGODB_URI / WEB_DB_NAME.
 *
 * Products are written through buildProductDoc(), so the documents use the
 * RetailERP field names declared in src/lib/erp-mapping.ts. Change a name
 * there and the seed follows.
 */
import "dotenv/config";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { Types, type Model } from "mongoose";
import { env } from "@/lib/env";
import { closeConnections, getWebConnection } from "@/lib/db";
import {
  CATEGORY_FIELDS,
  CUSTOMER_FIELDS,
  ERP_COLLECTIONS,
  PRODUCT_FIELDS,
  buildAddressDoc,
  buildCategoryDoc,
  buildCustomerDoc,
  buildOrderDoc,
  buildOrderItemDoc,
  buildProductDoc,
  buildStoreDoc,
  productSlug,
} from "@/lib/erp-mapping";
import { getPath, roundTo, slugify } from "@/lib/utils";
import { ProductModel } from "@/models/erp/product.model";
import { CategoryModel } from "@/models/erp/category.model";
import { StoreModel } from "@/models/erp/store.model";
import { CustomerModel } from "@/models/erp/customer.model";
import { OrderModel } from "@/models/erp/order.model";
import {
  BannerModel,
  CmsPageModel,
  CollectionModel,
  HomepageSectionModel,
  MenuItemModel,
  ProductWebMetaModel,
  SiteSettingsModel,
  TestimonialModel,
} from "@/models/web/content.models";
import {
  AdminUserModel,
  CouponModel,
  CounterModel,
  PERMISSIONS,
  ReviewModel,
  RoleModel,
} from "@/models/web/commerce.models";
faker.seed(2026);
const pick = <T>(arr: readonly T[]) => faker.helpers.arrayElement(arr);
const picks = <T>(arr: readonly T[], n: number) => faker.helpers.arrayElements(arr, n);
/** Read a UI-keyed value back out of an ERP-shaped doc (keeps the seed mapping-safe). */
const gp = (doc: unknown, key: keyof typeof PRODUCT_FIELDS) => getPath(doc, PRODUCT_FIELDS[key]);
const gc = (doc: unknown, key: keyof typeof CATEGORY_FIELDS) => getPath(doc, CATEGORY_FIELDS[key]);

/* ------------------------------------------------------------------ */
/* Catalogue vocabulary                                                */
/* ------------------------------------------------------------------ */
const FABRICS = [
  { name: "Kanchipuram Silk", min: 15000, max: 80000, weaves: ["Handloom", "Korvai", "Jacquard"] },
  { name: "Banarasi Silk", min: 8000, max: 45000, weaves: ["Kadwa", "Cutwork", "Jacquard", "Tanchoi"] },
  { name: "Patola Silk", min: 20000, max: 80000, weaves: ["Double Ikat", "Single Ikat"] },
  { name: "Organza", min: 3000, max: 12000, weaves: ["Plain Weave", "Jacquard"] },
  { name: "Tussar Silk", min: 4000, max: 15000, weaves: ["Handloom", "Plain Weave"] },
  { name: "Linen", min: 3000, max: 9000, weaves: ["Handloom", "Jamdani"] },
  { name: "Chanderi", min: 3000, max: 10000, weaves: ["Handloom", "Tissue"] },
  { name: "Mysore Silk", min: 6000, max: 20000, weaves: ["Crepe", "Plain Weave"] },
  { name: "Paithani Silk", min: 12000, max: 60000, weaves: ["Handloom", "Brocade"] },
  { name: "Gadwal Silk", min: 8000, max: 30000, weaves: ["Handloom", "Kuppadam"] },
  { name: "Cotton", min: 3000, max: 6000, weaves: ["Handloom", "Jamdani", "Plain Weave"] },
  { name: "Georgette", min: 3000, max: 8000, weaves: ["Plain Weave"] },
] as const;
const CRAFTS = ["Zari", "Meenakari", "Kalamkari", "Hand Embroidery", "Bandhani", "Block Print", "Jamdani", "Cutwork"] as const;
const OCCASIONS = ["Wedding", "Bridal", "Festive", "Party", "Casual", "Office", "Pooja"] as const;
const COLORS = [
  "Maroon", "Red", "Mustard", "Emerald Green", "Bottle Green", "Royal Blue", "Peacock Blue", "Ivory",
  "Black", "Pink", "Lavender", "Orange", "Teal", "Beige", "Gold", "Purple",
] as const;
const MOTIFS = [
  "Elephant (Yanai)", "Peacock (Mayil)", "Paisley", "Floral", "Temple", "Checks", "Butta", "Rudraksha",
  "Mango", "Annam (Swan)", "Geometric", "Stripes",
] as const;
const BORDERS = ["Temple Border", "Zari Border", "Contrast Border", "Small Border", "Broad Border", "Ganga-Jamuna Border"] as const;
const DISCOUNTS = [0, 0, 0, 10, 15, 20, 25, 30] as const;

const TOP_CATEGORIES = [
  { name: "Sarees", code: "SAR", noun: "Saree", count: 72, subPrefix: "", subSuffix: " Sarees" },
  { name: "Fabrics", code: "FAB", noun: "Fabric", count: 18, subPrefix: "", subSuffix: " Fabric" },
  { name: "Plain Fabrics", code: "PLF", noun: "Plain Fabric", count: 15, subPrefix: "Plain ", subSuffix: "" },
  { name: "Dupatta", code: "DUP", noun: "Dupatta", count: 15, subPrefix: "", subSuffix: " Dupatta" },
] as const;

const DESCRIPTIONS = [
  "Woven on a traditional pit loom by master weavers, this piece carries the rhythm of hands that have worked the same craft for generations.",
  "The body is worked in fine pure silk with a lustrous drape; the pallu opens into a field of hand-set motifs that catch light as you move.",
  "A modern take on a heritage weave: lighter in hand, easier to drape, with the border and pallu kept faithful to the original tradition.",
  "Dyed with colour-fast yarns and finished with a soft hand, this is a piece meant to be worn often and passed on.",
];
const CARE = [
  "Dry clean only. Store folded in muslin, away from direct sunlight. Refold every few months to avoid permanent creases.",
  "Gentle hand wash in cold water for the first two washes, then machine wash on delicate. Dry in shade.",
  "Dry clean recommended. Iron on low heat with a cloth between the iron and the zari.",
];

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */
function makeProducts(storeId: Types.ObjectId) {
  const products: Record<string, unknown>[] = [];
  const meta: { sku: string; slug: string; isFeatured: boolean }[] = [];
  const subCategoryNames = new Map<string, Set<string>>();

  for (const cat of TOP_CATEGORIES) {
    subCategoryNames.set(cat.name, new Set());
    for (let i = 1; i <= cat.count; i++) {
      const fabric = pick(FABRICS);
      const isPlain = cat.name === "Plain Fabrics";
      const color = pick(COLORS);
      const motif = isPlain ? "Plain" : pick(MOTIFS);
      const border = isPlain ? undefined : pick(BORDERS);
      const weave = pick(fabric.weaves);
      const craft = isPlain ? undefined : pick(CRAFTS);
      const occasions = isPlain ? ["Casual"] : picks(OCCASIONS, faker.number.int({ min: 1, max: 3 }));
      const sku = `WE-${cat.code}-${String(i).padStart(4, "0")}`;

      const priceScale = cat.name === "Sarees" ? 1 : cat.name === "Dupatta" ? 0.35 : 0.4;
      const sellingPrice = roundTo(faker.number.int({ min: fabric.min, max: fabric.max }) * priceScale, 50);
      const discountPercent = pick(DISCOUNTS);
      const mrp = discountPercent ? roundTo(sellingPrice / (1 - discountPercent / 100), 50) : sellingPrice;

      const subCategory = `${cat.subPrefix}${fabric.name}${cat.subSuffix}`;
      subCategoryNames.get(cat.name)!.add(subCategory);

      const name = isPlain
        ? `${color} ${fabric.name} Plain Fabric`
        : cat.name === "Fabrics"
          ? `${color} ${fabric.name} Fabric with ${motif} Motif`
          : `${color} ${fabric.name} ${cat.noun} with ${motif} Motif and ${border}`;

      const createdAt = faker.date.recent({ days: 180 });
      const stockQty = faker.helpers.weightedArrayElement([
        { weight: 6, value: faker.number.int({ min: 4, max: 25 }) },
        { weight: 2, value: faker.number.int({ min: 1, max: 3 }) },
        { weight: 1, value: 0 },
      ]);
      const isNewArrival = Date.now() - createdAt.getTime() < 45 * 86400_000;

      products.push(
        buildProductDoc({
          sku,
          barcode: faker.string.numeric(13),
          name,
          description: `${pick(DESCRIPTIONS)} ${isPlain ? "" : `Finished with a ${border?.toLowerCase()} and a ${motif.toLowerCase()} pallu.`}`.trim(),
          category: cat.name,
          subCategory,
          fabric: fabric.name,
          weave,
          craft,
          occasion: occasions,
          color,
          motif,
          border,
          blouseIncluded: cat.name === "Sarees" ? faker.datatype.boolean(0.7) : false,
          length: cat.name === "Sarees" ? 6.3 : cat.name === "Dupatta" ? 2.5 : faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
          width: cat.name === "Dupatta" ? 0.9 : 1.15,
          weight: faker.number.int({ min: 350, max: 900 }),
          careInstructions: pick(CARE),
          mrp,
          sellingPrice,
          discountPercent,
          gstPercent: sellingPrice > 1000 ? 12 : 5,
          hsnCode: cat.name === "Sarees" ? "5007" : "5208",
          stockQty,
          storeId,
          images: [],
          videoUrl: faker.datatype.boolean(0.15) ? "https://www.w3schools.com/html/mov_bbb.mp4" : undefined,
          tags: [fabric.name, motif, color, ...occasions].map((t) => t.toLowerCase()),
          isNewArrival,
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        }),
      );
      meta.push({ sku, slug: productSlug(name, sku), isFeatured: faker.datatype.boolean(0.15) });
    }
  }
  return { products, meta, subCategoryNames };
}

function makeCategories(subCategoryNames: Map<string, Set<string>>) {
  const docs: Record<string, unknown>[] = [];
  const ids = new Map<string, Types.ObjectId>();
  let order = 0;
  for (const cat of TOP_CATEGORIES) {
    const id = new Types.ObjectId();
    ids.set(cat.name, id);
    docs.push({
      _id: id,
      ...buildCategoryDoc({
        name: cat.name,
        parentId: null,
        slug: slugify(cat.name),
        sortOrder: order++,
        isActive: true,
      }),
    });
    let subOrder = 0;
    for (const sub of Array.from(subCategoryNames.get(cat.name) ?? []).sort()) {
      docs.push({
        _id: new Types.ObjectId(),
        ...buildCategoryDoc({
          name: sub,
          parentId: id,
          slug: slugify(sub),
          sortOrder: subOrder++,
          isActive: true,
        }),
      });
    }
  }
  return { docs, ids };
}

function makeMenu(
  categoryDocs: Record<string, unknown>[],
  categoryIds: Map<string, Types.ObjectId>,
  products: Record<string, unknown>[],
) {
  const items: any[] = [];
  const topIds = new Map<string, Types.ObjectId>();
  let order = 0;

  const attrValues = (catName: string, key: "weave" | "craft" | "occasion" | "color" | "fabric") => {
    const set = new Set<string>();
    for (const p of products) {
      if (gp(p, "category") !== catName) continue;
      const v = gp(p, key) as unknown;
      if (Array.isArray(v)) v.forEach((x) => set.add(String(x)));
      else if (v) set.add(String(v));
    }
    return Array.from(set).sort();
  };

  for (const cat of TOP_CATEGORIES) {
    const slug = slugify(cat.name);
    const topId = new Types.ObjectId();
    topIds.set(cat.name, topId);
    items.push({ _id: topId, label: cat.name.toUpperCase(), kind: "top", parentId: null, categorySlug: slug, sortOrder: order++ });

    const groups: { title: string; key?: "weave" | "craft" | "occasion" | "color"; subcats?: boolean }[] =
      cat.name === "Sarees"
        ? [{ title: "By Weave", key: "weave" }, { title: "By Fabric", subcats: true }, { title: "By Craft", key: "craft" }, { title: "By Occasion", key: "occasion" }]
        : [{ title: "By Fabric", subcats: true }, { title: "By Colour", key: "color" }];

    groups.forEach((g, gi) => {
      const groupId = new Types.ObjectId();
      items.push({ _id: groupId, label: g.title, kind: "group", parentId: topId, sortOrder: gi });
      const links = g.subcats
        ? categoryDocs
            .filter((c) => String(gc(c, "parentId")) === String(categoryIds.get(cat.name)))
            .map((c) => ({ label: String(gc(c, "name")), categorySlug: String(gc(c, "slug")) }))
        : attrValues(cat.name, g.key!).map((v) => ({ label: v, categorySlug: slug, filterKey: g.key, filterValue: v }));
      links.slice(0, 12).forEach((l, li) => items.push({ _id: new Types.ObjectId(), kind: "link", parentId: groupId, sortOrder: li, ...l }));
    });
  }
  items.push({ _id: new Types.ObjectId(), label: "NEW ARRIVALS", kind: "top", parentId: null, href: "/new-arrivals", badge: "New", sortOrder: order++ });
  return items;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
async function main() {
  if (env.DATA_SOURCE === "erp") {
    console.error("Refusing to seed: DATA_SOURCE=erp points master data at RetailERP, which is read-only.");
    process.exit(1);
  }
  console.log(`Seeding ${env.WEB_DB_NAME} at ${env.MONGODB_URI.replace(/\/\/.*@/, "//***@")} …`);
  const conn = await getWebConnection();

  /* --- master data (ERP-shaped) --- */
  const Store = StoreModel(conn);
  const Product = ProductModel(conn);
  const Category = CategoryModel(conn);
  const Customer = CustomerModel(conn);
  const Order = OrderModel(conn);

  await Promise.all([Store, Product, Category, Customer, Order].map((M) => M.deleteMany({})));

  const storeId = new Types.ObjectId();
  await Store.create({
    _id: storeId,
    ...buildStoreDoc({
      name: "Bangalore Urban",
      address: "1ST FLOOR 4T, BLOCK 34, 27th Cross, 4th T Block East, 4th Block, Jayanagar, Bengaluru, Karnataka 560011",
      phone: "+91 80 4000 0000",
      city: "Bengaluru",
    }),
  });

  const { products, meta, subCategoryNames } = makeProducts(storeId);
  const { docs: categoryDocs, ids: categoryIds } = makeCategories(subCategoryNames);
  await Category.insertMany(categoryDocs);
  await Product.insertMany(products);
  console.log(`  ${ERP_COLLECTIONS.products}: ${products.length}, ${ERP_COLLECTIONS.categories}: ${categoryDocs.length}, ${ERP_COLLECTIONS.stores}: 1`);

  /* --- customers + orders (website-owned, ERP-shaped) --- */
  const customerIds: Types.ObjectId[] = [];
  const customerDocs = Array.from({ length: 18 }, () => {
    const id = new Types.ObjectId();
    customerIds.push(id);
    return {
      _id: id,
      ...buildCustomerDoc({
        name: faker.person.fullName(),
        mobile: `9${faker.string.numeric(9)}`,
        email: faker.internet.email().toLowerCase(),
        addresses: [
          buildAddressDoc({
            name: faker.person.fullName(),
            phone: `9${faker.string.numeric(9)}`,
            line1: faker.location.streetAddress(),
            line2: faker.location.secondaryAddress(),
            city: pick(["Bengaluru", "Chennai", "Hyderabad", "Mumbai", "Mysuru"]),
            state: pick(["Karnataka", "Tamil Nadu", "Telangana", "Maharashtra"]),
            pincode: `5${faker.string.numeric(5)}`,
            country: "India",
            isDefault: true,
          }),
        ],
        gstNumber: undefined,
        loyaltyPoints: faker.number.int({ min: 0, max: 2500 }),
        createdAt: faker.date.recent({ days: 200 }),
      }),
    };
  });
  await Customer.insertMany(customerDocs);

  const STATUSES = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered", "Delivered", "Delivered", "Cancelled"] as const;
  const orderDocs = Array.from({ length: 48 }, (_, i) => {
    const createdAt = faker.date.recent({ days: 90 });
    const cust = pick(customerDocs);
    const lines = picks(products, faker.number.int({ min: 1, max: 3 })).map((p) => {
      const qty = 1;
      const rate = gp(p, "sellingPrice") as number;
      const gstPct = gp(p, "gstPercent") as number;
      const gst = Math.round((rate * gstPct) / (100 + gstPct));
      return buildOrderItemDoc({
        productId: undefined,
        sku: gp(p, "sku"),
        name: gp(p, "name"),
        image: (gp(p, "images") as string[] | undefined)?.[0],
        qty,
        rate,
        discount: 0,
        gst,
        amount: rate * qty,
      });
    });
    const subTotal = lines.reduce((s, l: any) => s + l.amount, 0);
    const gstTotal = lines.reduce((s, l: any) => s + l.gst, 0);
    const shippingCharge = subTotal > 4999 ? 0 : 149;
    const status = pick(STATUSES);
    const ymd = createdAt.toISOString().slice(0, 10).replace(/-/g, "");
    return {
      ...buildOrderDoc({
        orderNo: `WE-${ymd}-${String(i + 1).padStart(4, "0")}`,
        customerId: cust._id,
        items: lines,
        subTotal,
        discountTotal: 0,
        gstTotal,
        shippingCharge,
        netAmount: subTotal + shippingCharge,
        paymentMode: pick(["COD", "RAZORPAY", "UPI"]),
        paymentStatus: status === "Cancelled" ? "Refunded" : status === "Placed" ? "Pending" : "Paid",
        orderStatus: status,
        shippingAddress: (getPath(cust, CUSTOMER_FIELDS.addresses) as unknown[] | undefined)?.[0],
        awbNo: ["Shipped", "Delivered"].includes(status) ? `AWB${faker.string.numeric(10)}` : undefined,
        storeId,
        createdAt,
      }),
      statusHistory: [{ status: "Placed", by: "system", at: createdAt }],
    };
  });
  await Order.insertMany(orderDocs);
  console.log(`  customers: ${customerDocs.length}, orders: ${orderDocs.length}`);

  /* --- website-owned content --- */
  const Meta = ProductWebMetaModel(conn);
  const Settings = SiteSettingsModel(conn);
  const Menu = MenuItemModel(conn);
  const Banner = BannerModel(conn);
  const Collection = CollectionModel(conn);
  const Cms = CmsPageModel(conn);
  const Testimonial = TestimonialModel(conn);
  const Section = HomepageSectionModel(conn);
  const Coupon = CouponModel(conn);
  const Review = ReviewModel(conn);
  const Role = RoleModel(conn);
  const Admin = AdminUserModel(conn);
  const Counter = CounterModel(conn);

  await Promise.all(
    ([Meta, Settings, Menu, Banner, Collection, Cms, Testimonial, Section, Coupon, Review, Role, Admin, Counter] as Model<any>[]).map(
      (M) => M.deleteMany({}),
    ),
  );

  await Meta.insertMany(meta.map((m) => ({ ...m, itemCode: `web:${m.sku}`, salesCount: faker.number.int({ min: 0, max: 40 }) })));

  await Settings.create({
    key: "default",
    defaultStoreId: String(storeId),
    contact: {
      phone: "099163 11500",
      email: "hello@wovenessence.in",
      address: "1ST FLOOR 4T, BLOCK 34, 27th Cross, 4th T Block East, 4th Block, Jayanagar, Bengaluru, Karnataka 560011",
      hours: "Mon–Sat, 10:30 am – 8:30 pm",
    },
    social: { instagram: "https://www.instagram.com/templefabrics/?hl=en", facebook: "", youtube: "" },
    seo: {
      defaultTitle: "Woven Essence by Temple Fabrics — Handloom Sarees, Bengaluru",
      defaultDescription:
        "Kanchipuram, Banarasi, Patola and handloom sarees from Temple Fabrics, Bangalore Urban. Tradition in every weave.",
    },
    trustBadges: [
      { title: "Premium Fabrics", text: "Pure silks and handlooms, sourced from weaving clusters we know by name.", icon: "gem" },
      { title: "Exquisite Designs", text: "Motifs and borders chosen for how they drape, not just how they photograph.", icon: "sparkles" },
      { title: "Timeless Elegance", text: "Pieces meant to be worn for decades and handed down.", icon: "crown" },
      { title: "Rooted in Tradition", text: "Three generations of Temple Fabrics in Bengaluru.", icon: "landmark" },
    ],
  });

  await Menu.insertMany(makeMenu(categoryDocs, categoryIds, products));

  await Banner.insertMany([
    { placement: "hero", title: "The Kanchipuram Edit", subtitle: "Temple borders, korvai weaves, twelve new colours for the wedding season.", ctaLabel: "Shop Kanchipuram", ctaHref: "/collections/sarees?fabric=Kanchipuram%20Silk", image: { desktop: "/hero-red-silk.png", alt: "Red silk saree" }, sortOrder: 0 },
    { placement: "hero", title: "Yanai Motif Sarees", subtitle: "The elephant, woven the way Kanchi has always woven it.", ctaLabel: "See the collection", ctaHref: "/collections/yanai-motif-sarees", image: { desktop: "/hero-sarees-courtyard.png", alt: "Traditional sarees" }, sortOrder: 1 },
    { placement: "hero", title: "Everyday Handlooms", subtitle: "Linen, Chanderi and cotton — under ₹5,000.", ctaLabel: "Shop under ₹5,000", ctaHref: "/collections/under-5000", image: { desktop: "/hero-pink-silk.png", alt: "Pink handwoven saree" }, sortOrder: 2 },
    { placement: "lifestyle", title: "Bridal Trousseau", subtitle: "Book a private viewing at Bangalore Urban.", ctaLabel: "Plan a visit", ctaHref: "/store-locator", image: { desktop: "/curated-saree-black-floral.webp", alt: "Bridal saree" }, sortOrder: 0 },
    { placement: "lifestyle", title: "Festive Banarasi", subtitle: "Kadwa and cutwork weaves in jewel tones.", ctaLabel: "Shop Banarasi", ctaHref: "/collections/sarees?fabric=Banarasi%20Silk", image: { desktop: "/curated-saree-orange-classic.webp", alt: "Festive Banarasi saree" }, sortOrder: 1 },
  ]);

  const featuredSkus = meta.filter((m) => m.isFeatured).slice(0, 12).map((m) => m.sku);
  await Collection.insertMany([
    { name: "Yanai Motif Sarees", slug: "yanai-motif-sarees", description: "Sarees carrying the elephant motif — a symbol of strength and good fortune in Kanchi weaving.", type: "rule", rules: [{ key: "category", op: "eq", value: "sarees" }, { key: "motif", op: "in", value: ["Elephant (Yanai)"] }], isFeatured: true, sortOrder: 0, seoTitle: "Yanai (Elephant) Motif Sarees", seoDescription: "Handloom sarees with elephant motifs from Woven Essence, Bengaluru." },
    { name: "Bridal Kanchipuram", slug: "bridal-kanchipuram", description: "Heavy silks with broad temple borders for the mandap.", type: "rule", rules: [{ key: "fabric", op: "in", value: ["Kanchipuram Silk"] }, { key: "occasion", op: "in", value: ["Bridal", "Wedding"] }], isFeatured: true, sortOrder: 1 },
    { name: "Festive Banarasi", slug: "festive-banarasi", description: "Kadwa, cutwork and tanchoi weaves in jewel tones.", type: "rule", rules: [{ key: "fabric", op: "in", value: ["Banarasi Silk"] }, { key: "occasion", op: "in", value: ["Festive", "Party"] }], isFeatured: true, sortOrder: 2 },
    { name: "Under ₹5,000", slug: "under-5000", description: "Everyday handlooms that don't compromise on the weave.", type: "rule", rules: [{ key: "priceMax", op: "lte", value: 5000 }], isFeatured: true, sortOrder: 3 },
    { name: "Editor's Picks", slug: "editors-picks", description: "Hand-picked by the Temple Fabrics team this season.", type: "manual", skus: featuredSkus, isFeatured: false, sortOrder: 4 },
  ]);

  await Cms.insertMany([
    { title: "About Woven Essence", slug: "about", type: "page", body: "## Tradition in every weave\n\nWoven Essence is the online home of Temple Fabrics, a family saree house in Bengaluru. We work directly with weaving families in Kanchipuram, Varanasi, Patan and Chanderi …" },
    { title: "Contact us", slug: "contact", type: "page", body: "Visit us at Bangalore Urban or write to hello@wovenessence.in." },
    { title: "Privacy policy", slug: "privacy-policy", type: "policy", body: "We collect only what we need to fulfil your order …", sortOrder: 0 },
    { title: "Terms of service", slug: "terms", type: "policy", body: "By placing an order you agree to …", sortOrder: 1 },
    { title: "Shipping policy", slug: "shipping-policy", type: "policy", body: "Orders ship within 2 working days from Bengaluru. Free shipping above ₹4,999 across India.", sortOrder: 2 },
    { title: "Returns & exchanges", slug: "returns", type: "policy", body: "Unworn pieces with tags may be exchanged within 7 days of delivery. Blouse-stitched sarees are not returnable.", sortOrder: 3 },
    { title: "FAQs", slug: "faq", type: "faq", body: "### Do you stitch blouses?\nYes, at Bangalore Urban.\n\n### Is the zari real?\nEvery Kanchipuram listed as pure zari carries a silk mark certificate." },
  ]);

  await Testimonial.insertMany(
    Array.from({ length: 6 }, (_, i) => ({
      name: faker.person.fullName({ sex: "female" }),
      city: pick(["Bengaluru", "Chennai", "Hyderabad", "Pune", "Kochi", "Dubai"]),
      rating: 5,
      text: pick([
        "The Kanchipuram I bought for my daughter's wedding was exactly as photographed. The zari is real and the drape is beautiful.",
        "Fast delivery, honest descriptions, and the blouse fabric was included as promised.",
        "I've bought from the Bangalore store for years; the website finally makes it easy to send sarees to family abroad.",
        "Loved the packaging and the care card. Will buy again for Diwali.",
      ]),
      sortOrder: i,
    })),
  );

  await Section.insertMany(
    ["hero", "trust", "categories", "featuredCollections", "newArrivals", "occasions", "fabrics", "lifestyle", "testimonials", "instagram", "newsletter", "support"].map(
      (key, i) => ({ key, sortOrder: i, isVisible: true, config: key === "newArrivals" ? { limit: 8 } : {}, ...(key === "support" ? { title: "How can we help?", subtitle: "Questions about a saree, an order, or something not working? Send us a note and our team will get back to you." } : {}) }),
    ),
  );

  await Coupon.insertMany([
    { code: "WELCOME10", description: "10% off your first order", type: "percent", value: 10, minCart: 5000, maxDiscount: 3000, perCustomerLimit: 1, validTo: new Date("2027-12-31") },
    { code: "FESTIVE500", description: "₹500 off orders above ₹10,000", type: "flat", value: 500, minCart: 10000, usageLimit: 500, validTo: new Date("2026-12-31") },
  ]);

  await Review.insertMany(
    Array.from({ length: 70 }, () => ({
      sku: gp(pick(products), "sku") as string,
      customerName: faker.person.fullName(),
      rating: faker.helpers.weightedArrayElement([{ weight: 6, value: 5 }, { weight: 3, value: 4 }, { weight: 1, value: 3 }]),
      title: pick(["Beautiful weave", "Worth every rupee", "As described", "Lovely colour"]),
      body: pick(["The colour is richer in person.", "Drapes beautifully; got compliments all evening.", "Blouse piece included, good length.", "Delivered in three days, packed well."]),
      status: faker.helpers.weightedArrayElement([{ weight: 8, value: "approved" }, { weight: 1, value: "pending" }, { weight: 1, value: "rejected" }]),
      isVerifiedPurchase: faker.datatype.boolean(0.7),
    })),
  );

  /* --- admin --- */
  const [adminRole] = await Role.insertMany([
    { name: "Administrator", slug: "admin", permissions: ["*"], isSystem: true },
    { name: "Manager", slug: "manager", permissions: PERMISSIONS.filter((p) => !["users:write", "settings:write"].includes(p)), isSystem: true },
    { name: "Staff", slug: "staff", permissions: ["dashboard:read", "products:read", "orders:read", "orders:write", "customers:read", "inventory:read"], isSystem: true },
  ]);
  const adminEmail = "admin@wovenessence.in";
  const adminPassword = "Admin@123";
  await Admin.create({ name: "Store Admin", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10), roleId: adminRole._id });

  console.log("  website-owned collections seeded (menu, banners, collections, cms, settings, coupons, reviews, roles)");
  console.log(`\nAdmin login → ${adminEmail} / ${adminPassword}`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeConnections());
