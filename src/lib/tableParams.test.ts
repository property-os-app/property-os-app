import { describe, expect, it } from "vitest";
import { readTableParams, writeTableParams, type TableDefaults, type TableParams } from "@/lib/tableParams";

type Filters = { status: string; manager: string };

const defaults: TableDefaults<Filters> = {
  filters: { status: "all", manager: "all" },
  sort: { key: "name", direction: "asc" },
  sortKeys: ["name", "balance"],
  filterValues: {
    status: ["all", "active", "draft"],
    // Managers still loading for "pending": keep the value.
    manager: (v) => (v === "pending" ? undefined : ["all", "m1", "m2"].includes(v)),
  },
};

const read = (query: string) => readTableParams(new URLSearchParams(query), defaults);

describe("readTableParams", () => {
  it("defaults for an empty query", () => {
    expect(read("")).toEqual({ search: "", filters: { status: "all", manager: "all" }, sort: { key: "name", direction: "asc" }, page: 1 });
  });

  it("reads every key", () => {
    expect(read("q=grace&status=active&manager=m2&sort=balance-desc&page=3")).toEqual({
      search: "grace",
      filters: { status: "active", manager: "m2" },
      sort: { key: "balance", direction: "desc" },
      page: 3,
    });
  });

  it("unknown filter values fall back to the default", () => {
    expect(read("status=nope&manager=m9").filters).toEqual({ status: "all", manager: "all" });
    expect(read("status=").filters.status).toBe("all");
  });

  it("a check that can't tell yet (undefined) keeps the value", () => {
    expect(read("manager=pending").filters.manager).toBe("pending");
  });

  it("filters without allowed values take anything", () => {
    const open: TableDefaults<{ type: string }> = { filters: { type: "all" }, sort: null, sortKeys: [] };
    expect(readTableParams(new URLSearchParams("type=whatever"), open).filters.type).toBe("whatever");
  });

  it("invalid sort falls back to the default", () => {
    for (const s of ["unit-asc", "balance", "balance-up", "-asc"]) expect(read(`sort=${s}`).sort).toEqual(defaults.sort);
  });

  it("invalid page falls back to 1", () => {
    for (const p of ["0", "-2", "abc", "1.5", "01", "9999999"]) expect(read(`page=${p}`).page).toBe(1);
    expect(read("page=999999").page).toBe(999999);
  });
});

describe("writeTableParams", () => {
  const state = (over: Partial<TableParams<Filters>> = {}): TableParams<Filters> => ({ ...read(""), ...over });
  const write = (s: TableParams<Filters>, query = "") => writeTableParams(new URLSearchParams(query), s, defaults).toString();

  it("leaves out default values", () => {
    expect(write(state())).toBe("");
  });

  it("writes non-default values", () => {
    const s = state({ search: "grace", filters: { status: "draft", manager: "all" }, sort: { key: "balance", direction: "desc" }, page: 2 });
    expect(write(s)).toBe("q=grace&status=draft&sort=balance-desc&page=2");
  });

  it("keeps other keys (like ?month=) and removes reset ones", () => {
    expect(write(state(), "month=2026-10&q=old&page=4&status=draft")).toBe("month=2026-10");
  });

  it("a blank search is left out; no sort is left out", () => {
    expect(write(state({ search: "   ", sort: null }))).toBe("");
  });

  it("round-trips", () => {
    const s = state({ search: "a b", filters: { status: "active", manager: "m1" }, sort: { key: "name", direction: "desc" }, page: 5 });
    expect(readTableParams(writeTableParams(new URLSearchParams(), s, defaults), defaults)).toEqual(s);
  });
});
