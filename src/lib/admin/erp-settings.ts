import { getErpConnection } from "@/lib/db";

export interface ErpSettingsSnapshot {
  fetchedAt: string;
  dbName: string;
  brand: {
    name: string | null;
    tagline: string | null;
  };
  contact: {
    phone: string | null;
    email: string | null;
    address: string | null;
    hours: string | null;
  };
  siteCommerce: {
    freeShippingThreshold: number | null;
    codAvailable: boolean | null;
    shippingCharge: number | null;
    codCharge: number | null;
  };
  storefront: {
    freeShippingThreshold: number | null;
    shippingCharge: number | null;
    estimatedDays: string | null;
    codEnabled: boolean | null;
    codFee: number | null;
    onlinePaymentEnabled: boolean | null;
    guestCheckout: boolean | null;
    lowStockThreshold: number | null;
  };
  returns: {
    window: string | null;
    policy: string | null;
  };
  branches: { id: string; name: string; code: string; status: string }[];
  siteSettingsUpdatedAt: string | null;
  storefrontSettingsUpdatedAt: string | null;
}

const stringValue = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const numberValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const booleanValue = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;
const timestamp = (value: unknown): string | null =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;

export async function getErpSettings(): Promise<ErpSettingsSnapshot> {
  const connection = await getErpConnection();
  if (!connection.db) throw new Error("RetailERP database connection is not ready");

  const [site, storefront, branches] = await Promise.all([
    connection.db.collection("sitesettings").findOne({ key: "default" }),
    connection.db.collection("storefrontSettings").findOne(
      { key: "storefront" },
      { sort: { updatedAt: -1 } },
    ),
    connection.db.collection("branches")
      .find({ status: "active", isDeleted: { $ne: true } }, {
        projection: { branchName: 1, branchCode: 1, status: 1 },
      })
      .sort({ branchName: 1 })
      .toArray(),
  ]);

  const siteBrand = site?.brand ?? {};
  const contact = site?.contact ?? {};
  const siteShipping = site?.shipping ?? {};
  const storefrontShipping = storefront?.shipping ?? {};
  const cod = storefront?.cod ?? {};
  const branchRows = branches.map((branch) => ({
    id: String(branch._id),
    name: stringValue(branch.branchName) ?? "Unnamed branch",
    code: stringValue(branch.branchCode) ?? "",
    status: stringValue(branch.status) ?? "unknown",
  }));

  return {
    fetchedAt: new Date().toISOString(),
    dbName: connection.name,
    brand: {
      name: stringValue(siteBrand.name),
      tagline: stringValue(siteBrand.tagline),
    },
    contact: {
      phone: stringValue(contact.phone),
      email: stringValue(contact.email),
      address: stringValue(contact.address),
      hours: stringValue(contact.hours),
    },
    siteCommerce: {
      freeShippingThreshold: numberValue(siteShipping.freeShippingThreshold),
      codAvailable: booleanValue(siteShipping.codAvailable),
      shippingCharge: numberValue(siteShipping.standardCharge),
      codCharge: numberValue(siteShipping.codCharge),
    },
    storefront: {
      freeShippingThreshold: numberValue(storefrontShipping.freeShippingThreshold),
      shippingCharge: numberValue(storefrontShipping.flatRate),
      estimatedDays: stringValue(storefrontShipping.estimatedDays),
      codEnabled: booleanValue(cod.enabled),
      codFee: numberValue(cod.fee),
      onlinePaymentEnabled: booleanValue(storefront?.onlinePaymentEnabled),
      guestCheckout: booleanValue(storefront?.guestCheckout),
      lowStockThreshold: numberValue(storefront?.lowStockThreshold),
    },
    returns: {
      window: stringValue(site?.returns?.window),
      policy: stringValue(site?.returns?.policy),
    },
    branches: branchRows,
    siteSettingsUpdatedAt: timestamp(site?.updatedAt),
    storefrontSettingsUpdatedAt: timestamp(storefront?.updatedAt),
  };
}
