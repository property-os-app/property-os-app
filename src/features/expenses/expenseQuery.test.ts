import { describe, expect, it } from "vitest";
import { activeExpenseFilterCount, expenseQuery, expenseSummaryQuery, initialExpenseFilters, type ExpenseQueryInput } from "@/features/expenses/expenseQuery";

const base: ExpenseQueryInput = {
  search: "",
  filters: initialExpenseFilters,
  sort: { key: "date", direction: "desc" },
  page: 1,
  scope: null,
  isOwner: true,
  today: "2026-10-28",
};

describe("expenseQuery", () => {
  it("always sends year to date and leaves out the defaults", () => {
    expect(expenseQuery(base)).toEqual({ page: 1, pageSize: 25, from: "2026-01-01", to: "2026-10-28" });
  });

  it("sends the scope as propertyId", () => {
    expect(expenseQuery({ ...base, scope: "p1" }).propertyId).toBe("p1");
  });

  it("Portfolio-wide only sends allProperties and never propertyId (Owner only)", () => {
    const filters = { ...initialExpenseFilters, portfolio: "1" as const };
    const owner = expenseQuery({ ...base, scope: "p1", filters });
    expect(owner.allProperties).toBe(true);
    expect(owner.propertyId).toBeUndefined();
    const manager = expenseQuery({ ...base, scope: "p1", filters, isOwner: false });
    expect(manager.allProperties).toBeUndefined();
    expect(manager.propertyId).toBe("p1");
  });

  it("sends search, filters, voided, sort and page", () => {
    const q = expenseQuery({
      ...base,
      search: "  plumb ",
      filters: { ...initialExpenseFilters, category: "REPAIRS", vendor: "v1", status: "PENDING_APPROVAL", range: "last-year", voided: "1" },
      sort: { key: "amount", direction: "asc" },
      page: 3,
    });
    expect(q).toEqual({
      page: 3,
      pageSize: 25,
      from: "2025-01-01",
      to: "2025-12-31",
      search: "plumb",
      category: "REPAIRS",
      vendorId: "v1",
      status: "PENDING_APPROVAL",
      includeVoided: true,
      sort: "amount",
      order: "asc",
    });
  });

  it("sends the custom range, swapped when reversed", () => {
    const q = expenseQuery({ ...base, filters: { ...initialExpenseFilters, range: "custom", from: "2026-06-30", to: "2026-06-01" } });
    expect([q.from, q.to]).toEqual(["2026-06-01", "2026-06-30"]);
  });
});

describe("expenseSummaryQuery", () => {
  it("follows the range and property only", () => {
    const filters = { ...initialExpenseFilters, range: "this-month" as const, category: "REPAIRS", status: "APPROVED" as const };
    expect(expenseSummaryQuery({ ...base, scope: "p1", filters })).toEqual({ from: "2026-10-01", to: "2026-10-28", propertyId: "p1" });
    expect(expenseSummaryQuery({ ...base, scope: "p1", filters: { ...filters, portfolio: "1" } })).toEqual({ from: "2026-10-01", to: "2026-10-28" });
  });
});

describe("activeExpenseFilterCount", () => {
  it("counts changed filters, the custom range once", () => {
    expect(activeExpenseFilterCount(initialExpenseFilters)).toBe(0);
    expect(activeExpenseFilterCount({ ...initialExpenseFilters, range: "custom", from: "2026-01-01", to: "2026-02-01", status: "APPROVED" })).toBe(2);
  });
});
