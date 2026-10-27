import { describe, expect, it } from "vitest";
import { templateStatus, termText, versionAuthor } from "@/features/lease-templates/status";

describe("templateStatus", () => {
  it("puts Archived before Default", () => {
    expect(templateStatus({ isDefault: true, archivedAt: "2026-10-01T00:00:00.000Z" })).toBe("ARCHIVED");
    expect(templateStatus({ isDefault: true, archivedAt: null })).toBe("DEFAULT");
    expect(templateStatus({ isDefault: false, archivedAt: null })).toBe("ACTIVE");
  });
});

describe("termText", () => {
  it("says months, or null without a term", () => {
    expect(termText(12)).toBe("12 months");
    expect(termText(1)).toBe("1 month");
    expect(termText(null)).toBeNull();
  });
});

describe("versionAuthor", () => {
  it("shows the author's name", () => {
    expect(versionAuthor({ createdBy: { id: "u1", name: "Olivia Owner" } })).toBe("Olivia Owner");
  });

  it('shows "Built-in" for a version the system created (createdBy null)', () => {
    expect(versionAuthor({ createdBy: null })).toBe("Built-in");
  });
});
