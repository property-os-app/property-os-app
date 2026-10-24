import { describe, expect, it } from "vitest";
import { templateEndDate } from "@/features/leases/templatePrefill";

describe("templateEndDate", () => {
  it("start + N months − 1 day", () => {
    expect(templateEndDate({ start: "2025-12-01", end: "", autoEnd: "", months: 12 })).toBe("2026-11-30");
    expect(templateEndDate({ start: "2026-01-15", end: "", autoEnd: "", months: 6 })).toBe("2026-07-14");
  });

  it("clamps to the month's last day", () => {
    // Jan 31 + 1 month = Feb 28 (clamped), minus a day.
    expect(templateEndDate({ start: "2026-01-31", end: "", autoEnd: "", months: 1 })).toBe("2026-02-27");
  });

  it("needs a start date and a term", () => {
    expect(templateEndDate({ start: "", end: "", autoEnd: "", months: 12 })).toBeNull();
    expect(templateEndDate({ start: "2025-12-01", end: "", autoEnd: "", months: null })).toBeNull();
    expect(templateEndDate({ start: "2025-12-01", end: "", autoEnd: "", months: undefined })).toBeNull();
  });

  it("never overwrites an end date set by hand", () => {
    expect(templateEndDate({ start: "2025-12-01", end: "2026-06-30", autoEnd: "", months: 12 })).toBeNull();
    expect(templateEndDate({ start: "2025-12-01", end: "2026-06-30", autoEnd: "2026-11-30", months: 12 })).toBeNull();
  });

  it("follows a new start date while the end date is still the prefilled one", () => {
    expect(templateEndDate({ start: "2026-01-01", end: "2026-11-30", autoEnd: "2026-11-30", months: 12 })).toBe("2026-12-31");
  });

  it("follows another template's term while the end date is still the prefilled one", () => {
    expect(templateEndDate({ start: "2025-12-01", end: "2026-11-30", autoEnd: "2026-11-30", months: 6 })).toBe("2026-05-31");
  });

  it("returns null when nothing changes", () => {
    expect(templateEndDate({ start: "2025-12-01", end: "2026-11-30", autoEnd: "2026-11-30", months: 12 })).toBeNull();
  });
});
