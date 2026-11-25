import { describe, expect, it } from "vitest";
import { categoryLabel, categoryOptions, fallbackCategoryLabel } from "@/features/documents/categories";
import type { DocumentCategories } from "@/types/document";

// A slice of api-samples/document-categories.json.
const CATEGORIES: DocumentCategories = {
  lease: [
    { value: "SIGNED_LEASE", label: "Signed lease" },
    { value: "PET_AGREEMENT", label: "Pet agreement" },
    { value: "INSPECTION", label: "Other inspection" },
    { value: "OTHER", label: "Other" },
  ],
  tenant: [
    { value: "ID", label: "ID" },
    { value: "OTHER", label: "Other" },
  ],
  unit: [
    { value: "INSPECTION", label: "Inspection" },
    { value: "OLD_LEASE", label: "Old lease" },
    { value: "OTHER", label: "Other" },
  ],
  property: [
    { value: "SERVICE_CONTRACT", label: "Service contract (snow, lawn, etc.)" },
    { value: "OTHER", label: "Other" },
  ],
  payment: [
    { value: "RECEIPT", label: "Receipt" },
    { value: "CHECK_IMAGE", label: "Check (photo / scan)" },
    { value: "OTHER", label: "Other" },
  ],
};

describe("categoryOptions", () => {
  it("gives the owner type's own list in the API order", () => {
    expect(categoryOptions(CATEGORIES, "leases").map((c) => c.value)).toEqual(["SIGNED_LEASE", "PET_AGREEMENT", "INSPECTION", "OTHER"]);
    expect(categoryOptions(CATEGORIES, "units").map((c) => c.value)).toEqual(["INSPECTION", "OLD_LEASE", "OTHER"]);
    expect(categoryOptions(CATEGORIES, "properties")[0].label).toBe("Service contract (snow, lawn, etc.)");
  });

  it("is empty while the lists are loading", () => {
    expect(categoryOptions(undefined, "tenants")).toEqual([]);
  });
});

describe("categoryLabel", () => {
  it("looks the label up in that owner type's list (same value, different labels)", () => {
    expect(categoryLabel(CATEGORIES, "leases", "INSPECTION")).toBe("Other inspection");
    expect(categoryLabel(CATEGORIES, "units", "INSPECTION")).toBe("Inspection");
    expect(categoryLabel(CATEGORIES, "tenants", "ID")).toBe("ID");
    expect(categoryLabel(CATEGORIES, "payments", "CHECK_IMAGE")).toBe("Check (photo / scan)");
  });

  it("falls back to a readable label while loading", () => {
    expect(categoryLabel(undefined, "units", "OLD_LEASE")).toBe("Old lease");
    expect(categoryLabel(undefined, "leases", "MOVE_IN_INSPECTION")).toBe("Move in inspection");
  });

  it("falls back for a value not in that owner's list, never blank", () => {
    expect(categoryLabel(CATEGORIES, "leases", "OLD_LEASE")).toBe("Old lease");
    expect(categoryLabel(CATEGORIES, "tenants", "LEGACY")).toBe("Legacy");
    expect(categoryLabel(CATEGORIES, "tenants", "")).toBe("Uncategorised");
  });
});

describe("fallbackCategoryLabel", () => {
  it("turns a value into words", () => {
    expect(fallbackCategoryLabel("OLD_LEASE")).toBe("Old lease");
    expect(fallbackCategoryLabel("OTHER")).toBe("Other");
    expect(fallbackCategoryLabel("  ")).toBe("Uncategorised");
  });
});
