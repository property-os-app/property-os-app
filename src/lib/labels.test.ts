import { describe, expect, it } from "vitest";
import { documentCategoryLabel, documentCategoryLabels, unitLabel } from "@/lib/labels";

describe("documentCategoryLabels", () => {
  it("has exactly the API's categories per owner, in order", () => {
    expect(Object.keys(documentCategoryLabels.leases)).toEqual(["SIGNED_LEASE", "RENEWAL", "ADDENDUM", "INSPECTION", "NOTICE", "OTHER"]);
    expect(Object.keys(documentCategoryLabels.tenants)).toEqual(["ID", "APPLICATION", "OTHER"]);
    expect(Object.keys(documentCategoryLabels.units)).toEqual(["INSPECTION", "PHOTO", "OTHER"]);
    expect(Object.keys(documentCategoryLabels.properties)).toEqual(["OWNERSHIP", "INSURANCE", "TAX", "OTHER"]);
  });

  it("labels a stored category, and shows unknown text as is", () => {
    expect(documentCategoryLabel("leases", "SIGNED_LEASE")).toBe("Signed lease");
    expect(documentCategoryLabel("units", "PHOTO")).toBe("Photo");
    expect(documentCategoryLabel("tenants", "LEGACY")).toBe("LEGACY");
  });
});

describe("unitLabel", () => {
  it('adds "Unit " only when the number starts with a digit', () => {
    expect(unitLabel("2")).toBe("Unit 2");
    expect(unitLabel("4B")).toBe("Unit 4B");
    expect(unitLabel(" 101 ")).toBe("Unit 101");
  });

  it("shows other names as entered, so nothing reads \"Unit Unit 1\"", () => {
    expect(unitLabel("Unit 1")).toBe("Unit 1");
    expect(unitLabel("UNIT 1")).toBe("UNIT 1");
    expect(unitLabel("House")).toBe("House");
    expect(unitLabel("Office")).toBe("Office");
    expect(unitLabel("Single Fam")).toBe("Single Fam");
  });
});
