import { describe, expect, it } from "vitest";
import { inferProductType } from "@/lib/admin/product-type";

describe("inferProductType", () => {
  it.each([
    [{ group: "SAREES", name: "15-SA-PURE" }, "SAREES"],
    [{ group: "FABRICS", name: "4-FX-BUTI" }, "FABRICS"],
    [{ group: "PLAIN FABRICS", name: "10-PLNBTM" }, "PLAIN FABRICS"],
    [{ group: "DUPATTA", name: "DUPATTA" }, "DUPATTA"],
    [{ group: "NEW ARRIVALS", name: "15-SA-PURE" }, "NEW ARRIVALS"],
    [{ group: "ERP Products", name: "10-PLAIN FABRICS" }, "PLAIN FABRICS"],
    [{ group: "General", name: "15-SA-PURE", itemCode: "15-SA-PURE" }, "SAREES"],
    [{ group: "General", name: "15-SA", itemCode: "8A2526" }, "SAREES"],
    [{ group: "General", name: "DU-O", itemCode: "DU-O" }, "DUPATTA"],
    [{ group: "ERP Products", name: "misc item" }, ""],
  ])("infers a product type from ERP data", (product, expected) => {
    expect(inferProductType(product)).toBe(expected);
  });
});
