import { describe, expect, it } from "vitest";
import {
  activeTicketFilterCount,
  boardColumnQuery,
  boardCounts,
  initialTicketFilters,
  sortParam,
  tableQuery,
  ticketSummaryQuery,
  UNASSIGNED,
  type TicketQueryInput,
} from "@/features/maintenance/ticketQuery";
import type { TicketList } from "@/types/maintenance";

const base: TicketQueryInput = { search: "", filters: initialTicketFilters, scope: null };

describe("boardColumnQuery", () => {
  it("open columns: status, 100, priority sort", () => {
    expect(boardColumnQuery("OPEN", base, "2026-10-25")).toEqual({ page: 1, pageSize: 100, status: "OPEN", sort: "priority" });
    expect(boardColumnQuery("IN_PROGRESS", base, "2026-10-25").sort).toBe("priority");
  });
  it("resolved: this week, newest first", () => {
    expect(boardColumnQuery("RESOLVED", base, "2026-10-25")).toEqual({ page: 1, pageSize: 100, status: "RESOLVED", resolvedFrom: "2026-10-25" });
  });
  it("shared filters: search, scope, priority, assignee, past SLA", () => {
    const q = boardColumnQuery(
      "ASSIGNED",
      { search: " #1042 ", scope: "p1", filters: { ...initialTicketFilters, priority: "URGENT", assignee: "v1", pastSla: "1" } },
      "2026-10-25",
    );
    expect(q).toMatchObject({ search: "#1042", propertyId: "p1", priority: "URGENT", vendorId: "v1", pastSla: true });
  });
  it("unassigned never sends vendorId", () => {
    const q = boardColumnQuery("OPEN", { ...base, filters: { ...initialTicketFilters, assignee: UNASSIGNED } }, "2026-10-25");
    expect(q.unassigned).toBe(true);
    expect(q.vendorId).toBeUndefined();
  });
  it("ignores the table-only status and cancelled filters", () => {
    const q = boardColumnQuery("OPEN", { ...base, filters: { ...initialTicketFilters, status: "RESOLVED", cancelled: "1" } }, "2026-10-25");
    expect(q.status).toBe("OPEN");
    expect(q.includeCancelled).toBeUndefined();
  });
});

describe("sortParam / tableQuery", () => {
  it("maps the sort", () => {
    expect(sortParam({ key: "created", direction: "desc" })).toBeUndefined();
    expect(sortParam({ key: "created", direction: "asc" })).toBe("oldest");
    expect(sortParam({ key: "priority", direction: "desc" })).toBe("priority");
    expect(sortParam(null)).toBeUndefined();
  });
  it("defaults left out", () => {
    expect(tableQuery({ ...base, sort: { key: "created", direction: "desc" }, page: 1 })).toEqual({ page: 1, pageSize: 25 });
  });
  it("status, include cancelled, sort and page", () => {
    const q = tableQuery({ ...base, filters: { ...initialTicketFilters, cancelled: "1" }, sort: { key: "created", direction: "asc" }, page: 2 });
    expect(q).toEqual({ page: 2, pageSize: 25, includeCancelled: true, sort: "oldest" });
    const s = tableQuery({ ...base, filters: { ...initialTicketFilters, status: "CANCELLED", cancelled: "1" }, sort: null, page: 1 });
    expect(s.status).toBe("CANCELLED");
    expect(s.includeCancelled).toBeUndefined();
  });
});

describe("summary query, counts, filter count", () => {
  it("summary follows the scope only", () => {
    expect(ticketSummaryQuery(null)).toEqual({});
    expect(ticketSummaryQuery("p1")).toEqual({ propertyId: "p1" });
  });
  it("column counts: statusCounts for open columns, totalItems for resolved this week", () => {
    const list = (totalItems: number): TicketList => ({
      items: [],
      page: 1,
      pageSize: 100,
      totalItems,
      totalPages: 1,
      statusCounts: { OPEN: 3, ASSIGNED: 2, IN_PROGRESS: 2, RESOLVED: 9, CANCELLED: 1 },
    });
    expect(boardCounts(list(3), list(1))).toEqual({ OPEN: 3, ASSIGNED: 2, IN_PROGRESS: 2, RESOLVED: 1 });
    expect(boardCounts(undefined, undefined)).toEqual({ OPEN: undefined, ASSIGNED: undefined, IN_PROGRESS: undefined, RESOLVED: undefined });
  });
  it("filter count per view", () => {
    const f = { ...initialTicketFilters, priority: "LOW" as const, status: "OPEN" as const, cancelled: "1" as const };
    expect(activeTicketFilterCount(f, "board")).toBe(1);
    expect(activeTicketFilterCount(f, "table")).toBe(3);
  });
});
