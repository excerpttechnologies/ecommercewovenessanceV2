import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  customerCareFrom,
  customerEnquiryMessage,
  displayPhone,
  fabricCareFor,
  phoneHref,
  shippingReturnsFrom,
  whatsAppNumber,
} from "@/lib/product-info";

describe("fabric care", () => {
  it("gives silk products the silk-care section", () => {
    const care = fabricCareFor("Pure Kanchipuram Silk");
    expect(care.heading).toBe("Silk Care");
    expect(care.isSilk).toBe(true);
    expect(care.items.join(" ")).toMatch(/dry clean/i);
  });

  it("uses fabric care for cotton, chiffon and georgette", () => {
    for (const material of ["Cotton", "Chiffon", "Georgette"]) {
      const care = fabricCareFor(material);
      expect(care.heading).toBe("Fabric Care");
      expect(care.isSilk).toBe(false);
      expect(care.items.length).toBeGreaterThan(0);
    }
    expect(fabricCareFor("Chiffon").items.join(" ")).toMatch(/dry cleaning is recommended/i);
  });

  it("falls back to general care for an unknown fabric", () => {
    const care = fabricCareFor(undefined);
    expect(care.heading).toBe("Fabric Care");
    expect(care.items.length).toBeGreaterThan(0);
  });
});

describe("customer care", () => {
  it("builds a tel link and readable number from settings", () => {
    const info = customerCareFrom({ contact: { phone: "9876543210", email: "support@wovenessence.in" }, whatsappNumber: "919876543210" });
    expect(info.phone).toBe("+91 98765 43210");
    expect(info.phoneHref).toBe("tel:+919876543210");
    expect(info.emailHref).toBe("mailto:support@wovenessence.in");
    expect(info.whatsappNumber).toBe("919876543210");
  });

  it("never exposes the placeholder WhatsApp number", () => {
    expect(whatsAppNumber("919999999999")).toBeUndefined();
    expect(whatsAppNumber(undefined)).toBeUndefined();
    expect(customerCareFrom({ whatsappNumber: "919999999999" }).whatsappNumber).toBeUndefined();
  });

  it("encodes the pre-filled WhatsApp enquiry", () => {
    const url = buildWhatsAppUrl("+91 98765 43210", customerEnquiryMessage("Mysore Silk Saree"));
    expect(url).toBe(`https://wa.me/919876543210?text=${encodeURIComponent(customerEnquiryMessage("Mysore Silk Saree"))}`);
  });

  it("keeps phone formatting for numbers without a country code", () => {
    expect(displayPhone("080 4123 4567")).toBe("080 4123 4567");
    expect(phoneHref("080 4123 4567")).toBe("tel:+918041234567");
  });
});

describe("shipping and returns", () => {
  it("reflects configured shipping charges and business days", () => {
    const info = shippingReturnsFrom({
      commerce: { freeShippingAbove: 5000, shippingCharge: 99, processingDays: 3, returnWindowDays: 10 },
      shipping: { codExtraCharge: 50 },
      contact: { email: "care@wovenessence.in" },
    });
    expect(info.charges).toContain("₹5,000");
    expect(info.charges).toContain("₹99");
    expect(info.charges).toContain("₹50");
    expect(info.processing).toContain("3 business days");
    expect(info.returnEligibility).toContain("10 days");
    expect(info.international).toContain("care@wovenessence.in");
  });
});
