import { describe, expect, it } from "vitest";
import { floorAreaText, rentDiffNote, unitSummary, vacantListedText } from "@/features/units/stats";
import type { Unit } from "@/types/unit";

const unit = (over: Partial<Unit> = {}) =>
  ({ unitNumber: "1", unitType: "ONE_BED", bathrooms: 1, floor: null, floorArea: 750, monthlyRent: "1450.00", status: "VACANT", ...over }) as Unit;

describe("units without a rent or floor area", () => {
  it("unitSummary leaves out what isn't set", () => {
    expect(unitSummary(unit())).toBe("1 bd / 1 ba · 750 sq ft · Listed rent $1,450.00");
    expect(unitSummary(unit({ floorArea: null, monthlyRent: null, floor: 2 }))).toBe("1 bd / 1 ba · Floor 2");
    expect(unitSummary(unit({ monthlyRent: "0.00" }))).toContain("Listed rent $0.00");
  });

  it("floorAreaText", () => {
    expect(floorAreaText(1250.5)).toBe("1,250.5 sq ft");
    expect(floorAreaText(null)).toBeNull();
  });

  it("rentDiffNote never compares with a rent that isn't set", () => {
    expect(rentDiffNote("2000.00", null)).toBe("Listed rent not set");
    expect(rentDiffNote("2000.00", "0.00")).toBe("$2,000.00 over listed rent");
    expect(rentDiffNote("2000.00", "2000.00")).toBe("Same as listed rent");
  });

  it("vacantListedText sums the known rents and counts the others", () => {
    expect(vacantListedText([unit(), unit({ monthlyRent: "550.00" })])).toBe("$2.0K / mo listed");
    expect(vacantListedText([unit(), unit({ monthlyRent: null }), unit({ monthlyRent: null })])).toBe("$1.5K / mo listed · 2 not set");
    expect(vacantListedText([unit({ monthlyRent: null })])).toBe("1 not set");
    expect(vacantListedText([unit({ monthlyRent: "0.00" })])).toBe("$0 / mo listed");
    expect(vacantListedText([unit({ status: "OCCUPIED", monthlyRent: null })])).toBe("$0 / mo listed");
  });
});
