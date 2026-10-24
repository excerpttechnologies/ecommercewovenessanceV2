import { getErpConnection, getWebConnection } from "@/lib/db";
import { env } from "@/lib/env";
import { createErpAdapter } from "./adapters/erp.adapter";
import { createMockAdapter } from "./adapters/mock.adapter";
import { MongoBarcodeLabelRepository } from "./mongo/barcode-label.repository";
import { MongoCustomerRepository } from "./mongo/customer.repository";
import { MongoErpOrderRepository } from "./mongo/erp-order.repository";
import { MongoOrderRepository } from "./mongo/order.repository";
import { SiteRepository } from "./web/site.repository";
import type { BarcodeLabelRepository, CustomerRepository, MasterDataSource, OrderRepository } from "./types";

type Registry = {
  master?: MasterDataSource;
  barcodeLabels?: BarcodeLabelRepository;
  customers?: CustomerRepository;
  erpOrders?: MongoErpOrderRepository;
  orders?: OrderRepository;
  site?: SiteRepository;
};
const g = globalThis as unknown as { __wovenRepos?: Registry };
const reg: Registry = g.__wovenRepos ?? (g.__wovenRepos = {});

/** Products, categories, stores — from mock DB or RetailERP depending on DATA_SOURCE. */
export function getMasterData(): MasterDataSource {
  if (!reg.master) reg.master = env.DATA_SOURCE === "erp" ? createErpAdapter() : createMockAdapter();
  return reg.master;
}

/** RetailERP barcode labels (admin Products) — always the ERP database, whatever DATA_SOURCE says. */
export function getBarcodeLabels(): BarcodeLabelRepository {
  return (reg.barcodeLabels ??= new MongoBarcodeLabelRepository(getErpConnection));
}

/** Website-owned repositories — always the web DB, always writable. */
export function getCustomers(): CustomerRepository {
  return (reg.customers ??= new MongoCustomerRepository(getWebConnection));
}
export function getOrders(): OrderRepository {
  return (reg.orders ??= new MongoOrderRepository(getWebConnection));
}
/** RetailERP sales orders shown read-only in Admin → Orders. */
export function getErpOrders(): MongoErpOrderRepository {
  return (reg.erpOrders ??= new MongoErpOrderRepository(getErpConnection));
}
export function getSite(): SiteRepository {
  if (!reg.site || typeof reg.site.homepageSection !== "function") {
    reg.site = new SiteRepository(getWebConnection);
  }
  return reg.site;
}

export type { MasterDataSource, ProductRepository, CategoryRepository, StoreRepository, BarcodeLabelRepository, CustomerRepository, OrderRepository } from "./types";
