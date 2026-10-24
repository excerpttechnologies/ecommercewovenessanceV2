/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Connection, Model } from "mongoose";
import { z } from "zod";
import type { Permission } from "@/models/web/commerce.models";
import { AdminUserModel, CouponModel, EnquiryModel, ReviewModel, RoleModel } from "@/models/web/commerce.models";
import { BannerModel, CmsPageModel, CollectionModel, HomepageSectionModel, MenuItemModel, ProductWebMetaModel, TestimonialModel } from "@/models/web/content.models";

/**
 * Registry for the generic admin CRUD API (/api/v1/admin/:resource).
 * Adding a website-owned collection to the admin = one entry here + one page config.
 */
export interface ResourceDef {
  label: string;
  model: (c: Connection) => Model<any>;
  read: Permission;
  write: Permission;
  /** Fields used by ?q= */
  search: string[];
  sort: Record<string, 1 | -1>;
  create: z.ZodTypeAny;
  update: z.ZodTypeAny;
  /** Fields never returned to the client. */
  hidden?: string[];
}

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const nullableId = objectId.nullable().optional();
const img = z.string().min(1);

const MenuItem = z.object({
  label: z.string().min(1),
  kind: z.enum(["top", "group", "link"]),
  parentId: nullableId,
  href: z.string().optional(),
  categorySlug: z.string().optional(),
  filterKey: z.string().optional(),
  filterValue: z.string().optional(),
  image: z.string().optional(),
  badge: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
const Banner = z.object({
  placement: z.enum(["hero", "lifestyle", "category", "promo"]),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  image: z.object({ desktop: img, mobile: z.string().optional(), alt: z.string().optional() }),
  align: z.enum(["left", "center", "right"]).default("left"),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});
const Collection = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  type: z.enum(["manual", "rule"]).default("rule"),
  skus: z.array(z.string()).default([]),
  rules: z.array(z.object({ key: z.string(), op: z.enum(["eq", "in", "contains", "gte", "lte"]).default("in"), value: z.any() })).default([]),
  banner: z.object({ desktop: z.string().optional(), mobile: z.string().optional() }).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
const CmsPage = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(["page", "policy", "faq", "blog"]).default("page"),
  body: z.string().default(""),
  excerpt: z.string().optional(),
  coverImage: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  isPublished: z.boolean().default(true),
  publishedAt: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().default(0),
});
const Testimonial = z.object({ name: z.string().min(1), city: z.string().optional(), rating: z.number().int().min(1).max(5).default(5), text: z.string().min(1), image: z.string().optional(), isActive: z.boolean().default(true), sortOrder: z.number().int().default(0) });
const HomepageSection = z.object({ key: z.string().min(1), title: z.string().optional(), subtitle: z.string().optional(), config: z.record(z.any()).default({}), sortOrder: z.number().int().default(0), isVisible: z.boolean().default(true) });
const Coupon = z.object({
  code: z.string().min(2).max(30).transform((s) => s.toUpperCase()),
  description: z.string().optional(),
  type: z.enum(["percent", "flat", "bogo"]),
  value: z.number().min(0),
  minCart: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(0).nullable().optional(),
  perCustomerLimit: z.number().int().min(0).default(1),
  applicableCategories: z.array(z.string()).default([]),
  validFrom: z.coerce.date().nullable().optional(),
  validTo: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
  isAdvertised: z.boolean().default(false),
});
const Review = z.object({ status: z.enum(["pending", "approved", "rejected"]), title: z.string().optional(), body: z.string().optional() });
const Enquiry = z.object({ status: z.enum(["new", "in_progress", "closed"]) });
const Role = z.object({ name: z.string().min(1), slug: z.string().regex(/^[a-z0-9-]+$/), permissions: z.array(z.string()).default([]) });
const AdminUser = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8).optional(), roleId: objectId, isActive: z.boolean().default(true) });
const ProductWebMeta = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).optional(), seoTitle: z.string().optional(), seoDescription: z.string().optional(), extraImages: z.array(z.string()).optional(), webTags: z.array(z.string()).optional(), isFeatured: z.boolean().optional(), sortWeight: z.number().optional() });

export const RESOURCES: Record<string, ResourceDef> = {
  menu: { label: "Menu items", model: MenuItemModel, read: "menu:write", write: "menu:write", search: ["label"], sort: { sortOrder: 1 }, create: MenuItem, update: MenuItem.partial() },
  banners: { label: "Banners", model: BannerModel, read: "marketing:write", write: "marketing:write", search: ["title", "subtitle"], sort: { placement: 1, sortOrder: 1 }, create: Banner, update: Banner.partial() },
  collections: { label: "Collections", model: CollectionModel, read: "collections:write", write: "collections:write", search: ["name", "slug"], sort: { sortOrder: 1 }, create: Collection, update: Collection.partial() },
  pages: { label: "CMS pages", model: CmsPageModel, read: "content:write", write: "content:write", search: ["title", "slug"], sort: { type: 1, sortOrder: 1 }, create: CmsPage, update: CmsPage.partial() },
  testimonials: { label: "Testimonials", model: TestimonialModel, read: "content:write", write: "content:write", search: ["name", "text"], sort: { sortOrder: 1 }, create: Testimonial, update: Testimonial.partial() },
  homepage: { label: "Homepage sections", model: HomepageSectionModel, read: "content:write", write: "content:write", search: ["key", "title"], sort: { sortOrder: 1 }, create: HomepageSection, update: HomepageSection.partial() },
  coupons: { label: "Coupons", model: CouponModel, read: "marketing:write", write: "marketing:write", search: ["code", "description"], sort: { createdAt: -1 }, create: Coupon, update: Coupon.partial() },
  reviews: { label: "Reviews", model: ReviewModel, read: "reviews:moderate", write: "reviews:moderate", search: ["sku", "customerName", "body"], sort: { createdAt: -1 }, create: z.never(), update: Review.partial() },
  enquiries: { label: "Enquiries", model: EnquiryModel, read: "customers:read", write: "customers:write", search: ["name", "mobile", "email", "message"], sort: { createdAt: -1 }, create: z.never(), update: Enquiry.partial() },
  roles: { label: "Roles", model: RoleModel, read: "users:write", write: "users:write", search: ["name", "slug"], sort: { name: 1 }, create: Role, update: Role.partial() },
  users: { label: "Admin users", model: AdminUserModel, read: "users:write", write: "users:write", search: ["name", "email"], sort: { name: 1 }, create: AdminUser, update: AdminUser.partial(), hidden: ["passwordHash", "twoFactorSecret", "sessions"] },
  productMeta: { label: "Product web meta", model: ProductWebMetaModel, read: "products:read", write: "products:write", search: ["sku", "slug", "seoTitle"], sort: { sku: 1 }, create: z.never(), update: ProductWebMeta },
};

export function getResource(name: string): ResourceDef {
  const r = RESOURCES[name];
  if (!r) throw Object.assign(new Error(`Unknown resource "${name}"`), { status: 404, code: "NOT_FOUND" });
  return r;
}
