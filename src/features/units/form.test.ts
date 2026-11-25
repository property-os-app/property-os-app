import { describe, expect, it } from "vitest";
import { makeUnitSchema, unitChanges, unitCreateBody, unitDefaults, type UnitFormInput } from "@/features/units/form";
import type { Unit } from "@/types/unit";

const schema = makeUnitSchema([], () => "Maple Court");
const input = (over: Partial<UnitFormInput> = {}): UnitFormInput => ({ ...unitDefaults(undefined, "p1"), unitNumber: "4B", unitType: "ONE_BED", ...over });
const parse = (over: Partial<UnitFormInput> = {}) => schema.parse(input(over));
const message = (over: Partial<UnitFormInput>) => schema.safeParse(input(over)).error?.issues[0]?.message;

const saved: Unit = {
  id: "u1",
  propertyId: "p1",
  unitNumber: "4B",
  unitType: "ONE_BED",
  floorArea: 750,
  floor: null,
  bathrooms: null,
  monthlyRent: "1200.00",
  status: "VACANT",
  description: null,
  createdAt: "",
  updatedAt: "",
};
const changes = (unit: Unit, over: Partial<UnitFormInput>) => unitChanges(schema.parse({ ...unitDefaults(unit, "p1"), ...over }), unit);

describe("unit form: optional rent and floor area", () => {
  it("only the property, number and type are required", () => {
    expect(unitCreateBody(parse())).toEqual({ propertyId: "p1", unitNumber: "4B", unitType: "ONE_BED", status: "VACANT" });
    expect(message({ unitNumber: " " })).toBe("Enter the unit number.");
    expect(message({ propertyId: "" })).toBe("Choose a property.");
  });

  it("a rent of 0 is a real value", () => {
    expect(unitCreateBody(parse({ monthlyRent: 0, floorArea: "750.5" }))).toMatchObject({ monthlyRent: 0, floorArea: 750.5 });
  });

  it("limits still apply when filled", () => {
    expect(message({ floorArea: "0" })).toBe("Floor area must be more than 0.");
    expect(message({ floorArea: "abc" })).toBe("Use a number, e.g. 750 or 750.5.");
    expect(message({ monthlyRent: 100_000_000 })).toBe("Monthly rent can be at most $99,999,999.99.");
    expect(message({ monthlyRent: 99_999_999.99 })).toBeUndefined();
  });

  it("clearing sends null", () => {
    expect(changes(saved, { monthlyRent: "", floorArea: "" })).toEqual({ monthlyRent: null, floorArea: null });
  });

  it("not set and $0 are different", () => {
    expect(changes(saved, { monthlyRent: 0 })).toEqual({ monthlyRent: 0 });
    expect(changes({ ...saved, monthlyRent: "0.00" }, { monthlyRent: "" })).toEqual({ monthlyRent: null });
    expect(changes({ ...saved, monthlyRent: null }, { monthlyRent: 0 })).toEqual({ monthlyRent: 0 });
  });

  it("an untouched form sends nothing, with or without values", () => {
    expect(changes(saved, {})).toEqual({});
    expect(changes({ ...saved, monthlyRent: null, floorArea: null }, {})).toEqual({});
    expect(changes({ ...saved, monthlyRent: "0.00" }, {})).toEqual({});
  });
});
