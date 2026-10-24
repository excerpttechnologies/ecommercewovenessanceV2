import { describe, expect, it } from "vitest";
import { mapErpOrder, mapErpOrderStatus } from "@/repositories/mongo/erp-order.repository";

describe("mapErpOrder", () => {
  it("maps RetailERP orders, line items, payment, address, and history", () => {
    const order = mapErpOrder({
      _id: "order-id",
      orderNumber: "WE-TF0001-000001",
      customer: "customer-id",
      customerName: "A Customer",
      customerPhone: "9999999999",
      lines: [{
        item: "product-id",
        itemCode: "TF-0001",
        productName: "Silk saree",
        imageUrl: "/saree.jpg",
        quantity: 2,
        unitPrice: 500,
        lineSubtotal: 1000,
        gstAmount: 50,
      }],
      amounts: { subtotal: 1000, discount: 20, couponDiscount: 10, gstTotal: 50, shippingCharge: 40, grandTotal: 1060 },
      payment: { method: "razorpay", status: "paid" },
      status: "out_for_delivery",
      shippingAddress: {
        fullName: "A Customer",
        phone: "9999999999",
        line1: "1 Silk Street",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
        country: "India",
      },
      timeline: [{ status: "shipped", by: "warehouse", note: "Packed and dispatched", at: new Date("2026-10-01T09:00:00Z") }],
      createdAt: new Date("2026-09-30T09:00:00Z"),
    });

    expect(order).toMatchObject({
      id: "order-id",
      orderNo: "WE-TF0001-000001",
      customerId: "customer-id",
      subTotal: 1000,
      discountTotal: 30,
      gstTotal: 50,
      shippingCharge: 40,
      netAmount: 1060,
      paymentMode: "RAZORPAY",
      paymentStatus: "Paid",
      orderStatus: "Out for delivery",
      shippingAddress: { name: "A Customer", city: "Bengaluru", phone: "9999999999" },
      items: [{ sku: "TF-0001", name: "Silk saree", qty: 2, rate: 500, amount: 1000, gst: 50 }],
      statusHistory: [{ status: "Shipped", by: "warehouse", note: "Packed and dispatched", at: "2026-10-01T09:00:00.000Z" }],
      createdAt: "2026-09-30T09:00:00.000Z",
    });
  });

  it("maps ERP payment and order status variants", () => {
    expect(mapErpOrderStatus("pending_payment")).toBe("Placed");
    expect(mapErpOrderStatus("out_for_delivery")).toBe("Out for delivery");
    expect(mapErpOrderStatus("canceled")).toBe("Cancelled");
    expect(() => mapErpOrderStatus("unknown")).toThrow("Unsupported RetailERP order status");
    expect(() => mapErpOrder({ orderNumber: "missing-payment", status: "delivered" })).toThrow("Unsupported RetailERP payment method");
  });
});
