import { describe, expect, it } from "vitest";
import { templateOptions } from "@/features/leases/templateOptions";
import type { LeaseTemplateListItem } from "@/types/leaseTemplate";

const tpl = (over: Partial<LeaseTemplateListItem>): LeaseTemplateListItem => ({
  id: "t",
  name: "T",
  description: null,
  defaultTermMonths: null,
  isDefault: false,
  archivedAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  currentVersion: 1,
  leaseCount: 0,
  ...over,
});

const standard = tpl({ id: "std", name: "Standard Lease – 12-month", defaultTermMonths: 12, isDefault: true, currentVersion: 2 });
const short = tpl({ id: "short", name: "Short-term Lease – 6-month", defaultTermMonths: 6 });

describe("templateOptions", () => {
  it("lists templates with the default marked and their terms", () => {
    expect(templateOptions([standard, short], null)).toEqual([
      { value: "std", label: "Standard Lease – 12-month (default)", months: 12 },
      { value: "short", label: "Short-term Lease – 6-month", months: 6 },
    ]);
  });

  it("shows the lease's pinned version and a newer one", () => {
    const [first] = templateOptions([standard], { id: "std", name: standard.name, version: 1, archived: false });
    expect(first.label).toBe("Standard Lease – 12-month · v1 (this lease's version; latest is v2)");
    const [latest] = templateOptions([standard], { id: "std", name: standard.name, version: 2, archived: false });
    expect(latest.label).toBe("Standard Lease – 12-month · v2");
  });

  it("adds an archived current template on top", () => {
    const options = templateOptions([short], { id: "old", name: "Old Lease", version: 3, archived: true });
    expect(options[0]).toEqual({ value: "old", label: "Old Lease · v3 (archived)", months: null });
    expect(options).toHaveLength(2);
  });

  it("adds templates created in the wizard once", () => {
    const created = tpl({ id: "new", name: "New", defaultTermMonths: 9 });
    expect(templateOptions([standard], null, [created, standard]).map((o) => o.value)).toEqual(["std", "new"]);
  });
});
