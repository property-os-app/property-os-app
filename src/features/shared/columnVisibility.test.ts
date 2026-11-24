import { describe, expect, it } from "vitest";
import { parseSavedColumns } from "@/features/shared/columnVisibility";

describe("parseSavedColumns", () => {
  const known = ["market", "start", "end", "deposit"];
  it("keeps known keys in table order", () => {
    expect(parseSavedColumns('["deposit","market","old"]', known)).toEqual(["market", "deposit"]);
    expect(parseSavedColumns("[]", known)).toEqual([]);
  });
  it("drops keys of columns that no longer exist (the yearly rent roll's Renewal alert and Collected)", () => {
    expect(parseSavedColumns('["alert","deposit","collected"]', known)).toEqual(["deposit"]);
    expect(parseSavedColumns('["alert","collected"]', known)).toEqual([]);
  });
  it("ignores missing or broken values", () => {
    expect(parseSavedColumns(null, known)).toBeNull();
    expect(parseSavedColumns("not json", known)).toBeNull();
    expect(parseSavedColumns('{"a":1}', known)).toBeNull();
  });
});
