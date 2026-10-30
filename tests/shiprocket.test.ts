import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computePackage, erpWeightToKg } from "@/lib/shiprocket/package";
import {
  canAdvanceOrderStatus,
  canAdvanceShipping,
  mapShiprocketStatus,
  orderStatusForShipping,
  shippingEventKey,
} from "@/lib/shiprocket/status";
import { buildOrderPayload } from "@/lib/shiprocket/shipments";
import { buildReturnPayload } from "@/lib/shiprocket/returns";
import { applyFreeShipping, chargedShipping } from "@/lib/shiprocket/checkout";
import { quoteShipping, clearQuoteCache } from "@/lib/shiprocket/serviceability";
import { normalizeOrderShipping, shippingForNewOrder } from "@/lib/order-shipping";
import { mapOrder } from "@/lib/erp-mapping";
import { parseWebhookPayload, verifyWebhookToken } from "@/lib/shiprocket/webhook";
import { normalizeShippingSettings } from "@/lib/shipping-settings";
import type { ShippingContext } from "@/lib/shiprocket/config";
import type { ShiprocketConfig } from "@/lib/shiprocket/types";

const address = {
  name: "Asha Rao",
  phone: "9876543210",
  line1: "12 Temple Street",
  line2: "Jayanagar",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560041",
  country: "India",
};

function makeConfig(overrides: Partial<ShiprocketConfig> = {}): ShiprocketConfig {
  return {
    baseUrl: "https://shiprocket.test/v1/external",
    email: "store@example.com",
    password: "secret",
    pickupLocation: "Primary",
    pickupPincode: "560001",
    timeoutMs: 5_000,
    maxRetries: 0,
    defaultWeightKg: 0.7,
    defaultLengthCm: 30,
    defaultBreadthCm: 25,
    defaultHeightCm: 5,
    rateMarkupPercent: 10,
    codExtraCharge: 20,
    pickup: { name: "Warehouse", phone: "9999999999", email: "store@example.com", address: "1 Godown Road", address2: "", city: "Bengaluru", state: "Karnataka", pincode: "560001" },
    returnAddress: { name: "Returns", phone: "8888888888", email: "returns@example.com", address: "2 Return Road", address2: "", city: "Bengaluru", state: "Karnataka", pincode: "560002" },
    ...overrides,
  };
}

function makeContext(config: ShiprocketConfig | null = makeConfig()): ShippingContext {
  return {
    shipping: {
      ...normalizeShippingSettings({ enabled: true, fallbackToFlatRate: true, rateMarkupPercent: 10, codExtraCharge: 20 }),
      pickupLocation: "Primary",
      pickupPincode: "560001",
    },
    commerce: { shippingCharge: 149, freeShippingAbove: 4999, codEnabled: true, serviceablePincodePrefixes: [] },
    config,
  };
}

const packageBox = { weight: 1, length: 30, breadth: 25, height: 5 };

function stubFetch(couriers: unknown[], fail = false) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/auth/login")) {
      return new Response(JSON.stringify({ token: "token-1" }), { status: 200 });
    }
    if (fail) return new Response(JSON.stringify({ message: "boom" }), { status: 500 });
    return new Response(JSON.stringify({ data: { available_courier_companies: couriers } }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  clearQuoteCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearQuoteCache();
});

describe("package calculation", () => {
  it("converts ERP grams to kilograms", () => {
    expect(erpWeightToKg(600)).toBe(0.6);
    expect(erpWeightToKg(0.6)).toBe(0.6);
    expect(erpWeightToKg(undefined)).toBeUndefined();
  });

  it("sums item weights and stacks the box height", () => {
    const pkg = computePackage(
      [
        { sku: "A", qty: 2, weightKg: 0.5, lengthCm: 30, breadthCm: 25, heightCm: 5 },
        { sku: "B", qty: 1, weightKg: 0.4 },
      ],
      { weightKg: 0.7, lengthCm: 30, breadthCm: 25, heightCm: 5 },
    );
    expect(pkg.weight).toBe(1.4);
    expect(pkg.length).toBe(30);
    expect(pkg.height).toBeGreaterThanOrEqual(10);
  });

  it("falls back to the default weight for unknown products", () => {
    const pkg = computePackage([{ sku: "X", qty: 1 }], { weightKg: 0.7, lengthCm: 30, breadthCm: 25, heightCm: 5 });
    expect(pkg.weight).toBe(0.7);
  });
});

describe("status mapping and ordering", () => {
  it("maps shiprocket statuses", () => {
    expect(mapShiprocketStatus("OUT FOR DELIVERY")).toBe("out_for_delivery");
    expect(mapShiprocketStatus("PICKED UP")).toBe("in_transit");
    expect(mapShiprocketStatus("CANCELED")).toBe("cancelled");
    expect(mapShiprocketStatus("RTO DELIVERED")).toBe("rto_delivered");
    expect(mapShiprocketStatus("SOMETHING ELSE")).toBeNull();
  });

  it("maps fulfilment status to order status", () => {
    expect(orderStatusForShipping("in_transit")).toBe("Shipped");
    expect(orderStatusForShipping("delivered")).toBe("Delivered");
    expect(orderStatusForShipping("rto_delivered")).toBe("Returned");
    expect(orderStatusForShipping("undelivered")).toBeNull();
  });

  it("never moves a shipment backwards", () => {
    expect(canAdvanceShipping("created", "pickup_scheduled")).toBe(true);
    expect(canAdvanceShipping("delivered", "in_transit")).toBe(false);
    expect(canAdvanceShipping("cancelled", "delivered")).toBe(false);
  });

  it("never downgrades a delivered order", () => {
    expect(canAdvanceOrderStatus("Delivered", "Shipped")).toBe(false);
    expect(canAdvanceOrderStatus("Out for delivery", "Delivered")).toBe(true);
    expect(canAdvanceOrderStatus("Cancelled", "Packed")).toBe(false);
  });
});

describe("shiprocket payloads", () => {
  const request = {
    orderNo: "WE-20261030-0001",
    createdAt: new Date("2026-10-30T10:00:00Z"),
    paymentMode: "COD",
    netAmount: 1200,
    subTotal: 1051,
    shippingCharge: 149,
    items: [{ name: "Silk Saree", sku: "SAR-1", qty: 1, rate: 1051, discount: 0 }],
    address,
    package: packageBox,
  };

  it("builds a valid adhoc order payload", () => {
    const payload = buildOrderPayload(request, makeConfig());
    expect(payload.order_id).toBe("WE-20261030-0001");
    expect(payload.payment_method).toBe("COD");
    expect(payload.billing_pincode).toBe("560041");
    expect(payload.weight).toBe(1);
    expect(payload.pickup_location).toBe("Primary");
    expect((payload.order_items as unknown[]).length).toBe(1);
  });

  it("rejects an invalid phone before calling Shiprocket", () => {
    expect(() => buildOrderPayload({ ...request, address: { ...address, phone: "123" } }, makeConfig())).toThrow(/10-digit/);
  });

  it("mirrors the addresses for a return", () => {
    const payload = buildReturnPayload(request, makeContext());
    expect(payload.pickup_pincode).toBe("560041");
    expect(payload.shipping_pincode).toBe("560002");
    expect(payload.order_id).toBe("WE-20261030-0001-R1");
  });
});

describe("serviceability and rates", () => {
  it("uses the live courier rate plus markup and COD charge", async () => {
    stubFetch([
      { courier_company_id: 1, courier_name: "Test Express", freight_charge: 100, cod: 1, estimated_delivery_days: "3" },
    ]);
    const quote = await quoteShipping(makeContext(), { deliveryPincode: "400001", package: packageBox, paymentMode: "COD" });
    expect(quote.provider).toBe("shiprocket");
    expect(quote.serviceable).toBe(true);
    expect(quote.codAvailable).toBe(true);
    expect(quote.baseShippingCharge).toBe(100);
    expect(quote.shippingCharge).toBe(130);
    expect(quote.etaDays).toBe(3);
  });

  it("reports no courier service instead of inventing a rate", async () => {
    stubFetch([]);
    const quote = await quoteShipping(makeContext(), { deliveryPincode: "400002", package: packageBox, paymentMode: "PREPAID" });
    expect(quote.serviceable).toBe(false);
    expect(quote.reason).toBe("no_courier_service");
    expect(quote.shippingCharge).toBe(0);
  });

  it("falls back to the flat rate when Shiprocket is not configured", async () => {
    const context: ShippingContext = { ...makeContext(null), config: null };
    const quote = await quoteShipping(context, { deliveryPincode: "400003", package: packageBox, paymentMode: "PREPAID" });
    expect(quote.fallback).toBe(true);
    expect(quote.provider).toBe("flat");
    expect(quote.shippingCharge).toBe(149);
  });

  it("applies the free-shipping threshold without losing the base rate", async () => {
    stubFetch([{ courier_company_id: 1, courier_name: "Test Express", freight_charge: 100, cod: 1 }]);
    const quote = await quoteShipping(makeContext(), { deliveryPincode: "400004", package: packageBox, paymentMode: "PREPAID" });
    const checkoutQuote = applyFreeShipping(quote, 6000, 4999);
    expect(checkoutQuote.freeShippingApplied).toBe(true);
    expect(checkoutQuote.shippingCharge).toBe(0);
    expect(checkoutQuote.baseShippingCharge).toBe(100);
    expect(chargedShipping(checkoutQuote)).toBe(0);
  });
});

describe("webhook", () => {
  it("requires the configured token", () => {
    process.env.SHIPROCKET_WEBHOOK_TOKEN = "secret-token";
    expect(verifyWebhookToken(new Headers({ "x-api-key": "secret-token" })).ok).toBe(true);
    expect(verifyWebhookToken(new Headers({ "x-api-key": "wrong" })).ok).toBe(false);
    expect(verifyWebhookToken(new Headers()).ok).toBe(false);
    delete process.env.SHIPROCKET_WEBHOOK_TOKEN;
  });

  it("parses status and produces a stable event key for duplicate protection", () => {
    const body = { order_id: "WE-1", awb: "AWB1", current_status: "OUT FOR DELIVERY", current_status_id: 17, event_time: "2026-10-30 10:00" };
    const first = parseWebhookPayload(body);
    const second = parseWebhookPayload({ ...body });
    expect(first?.status).toBe("out_for_delivery");
    expect(first?.eventKey).toBe(second?.eventKey);
    expect(first?.eventKey).toBe(shippingEventKey({ awb: "AWB1", orderNo: "WE-1", status: "out_for_delivery", statusCode: "17", date: "2026-10-30 10:00" }));
  });

  it("ignores payloads without a mappable status", () => {
    expect(parseWebhookPayload({ order_id: "WE-1", current_status: "SOMETHING NEW" })).toBeNull();
  });
});

describe("old order compatibility", () => {
  it("normalises orders that predate the shipping object", () => {
    const shipping = normalizeOrderShipping(undefined);
    expect(shipping.status).toBe("not_created");
    expect(shipping.trackingEvents).toEqual([]);
    expect(shipping.events).toEqual([]);
  });

  it("keeps legacy top-level awb/courier fields readable", () => {
    const order = mapOrder({
      orderNo: "WE-LEGACY-1",
      orderStatus: "Placed",
      paymentMode: "COD",
      paymentStatus: "Pending",
      subTotal: 100,
      netAmount: 100,
      awbNo: "OLD-AWB",
      courierName: "Old Courier",
      items: [],
      shippingAddress: address,
    });
    expect(order.awbNo).toBe("OLD-AWB");
    expect(order.courierName).toBe("Old Courier");
    expect(order.shipping.status).toBe("awb_assigned");
    expect(order.shipping.awbNo).toBe("OLD-AWB");
  });

  it("strips server-owned shipping fields from a new order payload", () => {
    const initial = shippingForNewOrder({
      status: "delivered",
      shiprocketOrderId: 10,
      shiprocketShipmentId: 20,
      awbNo: "AWB",
      events: ["x"],
    });
    expect(initial.shiprocketOrderId).toBeUndefined();
    expect(initial.shiprocketShipmentId).toBeUndefined();
    expect(initial.awbNo).toBeUndefined();
    expect(initial.events).toEqual([]);
  });
});
