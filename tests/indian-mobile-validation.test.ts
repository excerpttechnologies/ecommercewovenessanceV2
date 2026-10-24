import { describe, expect, it } from "vitest";
import { indianMobileSchema } from "@/lib/validation/indian-mobile";

describe("Indian mobile number validation", () => {
  it.each(["6123456789", "7123456789", "8123456789", "9123456789"])(
    "accepts a valid 10-digit number: %s",
    (mobile) => {
      expect(indianMobileSchema.safeParse(mobile).success).toBe(true);
    },
  );

  it.each(["1234567890", "5123456789", "912345678", "91234567890", "9876787898989898989", "98765abcde"])(
    "rejects an invalid mobile number: %s",
    (mobile) => {
      expect(indianMobileSchema.safeParse(mobile).success).toBe(false);
    },
  );

  it("allows a blank optional mobile number", () => {
    expect(indianMobileSchema.safeParse("").success).toBe(true);
    expect(indianMobileSchema.safeParse(undefined).success).toBe(true);
  });

  it("rejects emergency contact numbers with more than 10 digits", () => {
    expect(indianMobileSchema.safeParse("87766565567678778").success).toBe(false);
  });
});
