import { describe, expect, it } from "vitest";
import { unitLabel } from "@/lib/labels";

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
