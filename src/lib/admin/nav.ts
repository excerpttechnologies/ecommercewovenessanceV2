import type { Permission } from "@/models/web/commerce.models";

export interface NavItem { href: string; label: string; perm: Permission | Permission[]; group: string }

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", perm: "dashboard:read", group: "Overview" },
  { href: "/admin/assistant", label: "AI Assistant", perm: "dashboard:read", group: "Overview" },
  { href: "/admin/orders", label: "Orders", perm: "orders:read", group: "Sales" },
  { href: "/admin/customers", label: "Customers", perm: "customers:read", group: "Sales" },
  { href: "/admin/enquiries", label: "Enquiries", perm: "customers:read", group: "Sales" },
  { href: "/admin/reports", label: "Reports", perm: "reports:read", group: "Sales" },
  { href: "/admin/products", label: "Products", perm: "products:read", group: "Catalogue" },
  { href: "/admin/inventory", label: "Inventory & sync", perm: "inventory:read", group: "Catalogue" },
  { href: "/admin/collections", label: "Collections", perm: "collections:write", group: "Catalogue" },
  { href: "/admin/menu", label: "Menu builder", perm: "menu:write", group: "Catalogue" },
  { href: "/admin/reviews", label: "Reviews", perm: "reviews:moderate", group: "Catalogue" },
  { href: "/admin/homepage", label: "Homepage", perm: "content:write", group: "Content" },
  { href: "/admin/banners", label: "Banners", perm: "marketing:write", group: "Content" },
  { href: "/admin/coupons", label: "Coupons and Offers", perm: "marketing:write", group: "Marketing" },
  { href: "/admin/staff", label: "Staff", perm: "users:write", group: "Settings" },
  { href: "/admin/settings", label: "Settings", perm: "settings:write", group: "Settings" },
  { href: "/admin/users", label: "Users", perm: "users:write", group: "Settings" },
  { href: "/admin/roles", label: "Roles & permissions", perm: "users:write", group: "Settings" },
  { href: "/admin/audit", label: "Audit log", perm: "audit:read", group: "Settings" },
];
