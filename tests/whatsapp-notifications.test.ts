import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  orderFindOne,
  notificationFindOne,
  notificationFindOneAndUpdate,
  notificationUpdateOne,
  sendOrderPaymentTemplate,
} = vi.hoisted(() => ({
  orderFindOne: vi.fn(),
  notificationFindOne: vi.fn(),
  notificationFindOneAndUpdate: vi.fn(),
  notificationUpdateOne: vi.fn(),
  sendOrderPaymentTemplate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getWebConnection: vi.fn(async () => ({})) }));
vi.mock("@/models/erp/order.model", () => ({ OrderModel: () => ({ findOne: orderFindOne }) }));
vi.mock("@/models/web/commerce.models", () => ({
  WhatsAppNotificationModel: () => ({
    findOne: notificationFindOne,
    findOneAndUpdate: notificationFindOneAndUpdate,
    updateOne: notificationUpdateOne,
  }),
}));
vi.mock("@/repositories", () => ({ getCustomers: () => ({ getById: vi.fn() }) }));
vi.mock("@/lib/whatsapp/templates", () => ({ sendOrderPaymentTemplate }));

const { sendOrderPaymentSuccessMessage } = await import("@/lib/whatsapp/notifications");

const paidOrder = {
  orderNo: "WE-1001",
  paymentStatus: "Paid",
  customerId: "customer-1",
  netAmount: 1499,
  paymentMode: "RAZORPAY",
  paymentTransactionId: "pay_1",
  createdAt: new Date("2026-01-02T10:00:00Z"),
  shippingAddress: { name: "Asha Rao", phone: "9876543210" },
};

beforeEach(() => {
  vi.clearAllMocks();
  orderFindOne.mockReturnValue({ lean: async () => paidOrder });
  notificationFindOne.mockReturnValue({ lean: async () => null });
  notificationFindOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: "notification-1", status: "PENDING" }) });
  notificationUpdateOne.mockResolvedValue({ matchedCount: 1 });
  sendOrderPaymentTemplate.mockResolvedValue({ messageId: "wamid.1" });
});

describe("sendOrderPaymentSuccessMessage", () => {
  it("sends once for a paid order and records the provider message id", async () => {
    const result = await sendOrderPaymentSuccessMessage("WE-1001");

    expect(result).toEqual({ status: "SENT", messageId: "wamid.1" });
    expect(sendOrderPaymentTemplate).toHaveBeenCalledTimes(1);
    expect(sendOrderPaymentTemplate.mock.calls[0][0]).toBe("919876543210");
    expect(notificationFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: "order_paid:WE-1001",
        $or: expect.arrayContaining([
          { status: "FAILED" },
          expect.objectContaining({ status: "PENDING" }),
        ]),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: "PENDING", orderNo: "WE-1001" }),
        $inc: { attempts: 1 },
      }),
      { upsert: true, new: true },
    );
    expect(notificationUpdateOne).toHaveBeenCalledWith(
      { _id: "notification-1", status: "PENDING" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "SENT", providerMessageId: "wamid.1" }),
      }),
    );
  });

  it("never resends an order already marked SENT", async () => {
    notificationFindOne.mockReturnValue({
      lean: async () => ({ status: "SENT", providerMessageId: "wamid.old" }),
    });

    const result = await sendOrderPaymentSuccessMessage("WE-1001");

    expect(result).toEqual({ status: "ALREADY_SENT", messageId: "wamid.old" });
    expect(sendOrderPaymentTemplate).not.toHaveBeenCalled();
  });

  it("does not send before the server marks the order Paid", async () => {
    orderFindOne.mockReturnValue({ lean: async () => ({ ...paidOrder, paymentStatus: "Pending" }) });

    const result = await sendOrderPaymentSuccessMessage("WE-1001");

    expect(result).toEqual({ status: "SKIPPED", reason: "ORDER_NOT_PAID" });
    expect(notificationFindOneAndUpdate).not.toHaveBeenCalled();
    expect(sendOrderPaymentTemplate).not.toHaveBeenCalled();
  });

  it("records a failed delivery without throwing into order processing", async () => {
    sendOrderPaymentTemplate.mockRejectedValueOnce(new Error("HTTP 503"));

    const result = await sendOrderPaymentSuccessMessage("WE-1001");

    expect(result).toEqual({ status: "FAILED", reason: "HTTP 503" });
    expect(notificationUpdateOne).toHaveBeenCalledWith(
      { _id: "notification-1", status: "PENDING" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "FAILED", failureReason: "HTTP 503" }),
      }),
    );
  });

  it("records an invalid recipient instead of sending", async () => {
    orderFindOne.mockReturnValue({
      lean: async () => ({ ...paidOrder, shippingAddress: { name: "Asha Rao", phone: "12345" } }),
    });

    const result = await sendOrderPaymentSuccessMessage("WE-1001");

    expect(result).toEqual({ status: "FAILED", reason: "INVALID_WHATSAPP_NUMBER" });
    expect(sendOrderPaymentTemplate).not.toHaveBeenCalled();
    expect(notificationUpdateOne).toHaveBeenCalled();
  });
});
