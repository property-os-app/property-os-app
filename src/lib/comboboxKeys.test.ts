import { describe, expect, it } from "vitest";
import { initialActive, isMoveKey, moveActive } from "@/lib/comboboxKeys";

describe("moveActive", () => {
  it("↓ goes from none to the first, then down, and wraps", () => {
    expect(moveActive("ArrowDown", -1, 3)).toBe(0);
    expect(moveActive("ArrowDown", 0, 3)).toBe(1);
    expect(moveActive("ArrowDown", 2, 3)).toBe(0);
  });
  it("↑ goes from none to the last, then up, and wraps", () => {
    expect(moveActive("ArrowUp", -1, 3)).toBe(2);
    expect(moveActive("ArrowUp", 2, 3)).toBe(1);
    expect(moveActive("ArrowUp", 0, 3)).toBe(2);
  });
  it("Home and End go to the first and last", () => {
    expect(moveActive("Home", 2, 3)).toBe(0);
    expect(moveActive("End", 0, 3)).toBe(2);
  });
  it("is none without options, and recovers from a highlight past the end", () => {
    for (const key of ["ArrowDown", "ArrowUp", "Home", "End"] as const) expect(moveActive(key, 0, 0)).toBe(-1);
    expect(moveActive("ArrowDown", 9, 3)).toBe(0);
    expect(moveActive("ArrowUp", 9, 3)).toBe(2);
  });
});

describe("initialActive", () => {
  it("is the first match while something is typed", () => {
    expect(initialActive(true, 3, -1)).toBe(0);
    expect(initialActive(true, 3, 2)).toBe(0);
  });
  it("is the chosen option, or none, with nothing typed", () => {
    expect(initialActive(false, 3, 2)).toBe(2);
    expect(initialActive(false, 3, -1)).toBe(-1);
  });
  it("is none when nothing matches", () => {
    expect(initialActive(true, 0, -1)).toBe(-1);
    expect(initialActive(false, 0, 0)).toBe(-1);
  });
});

describe("isMoveKey", () => {
  it("knows the moving keys", () => {
    expect(["ArrowDown", "ArrowUp", "Home", "End"].every(isMoveKey)).toBe(true);
    expect(["Enter", "Escape", "Tab", "a"].some(isMoveKey)).toBe(false);
  });
});
