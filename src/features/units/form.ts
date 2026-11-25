/** The unit form: rules, values and the POST / PATCH bodies. No API import, so it is unit-testable. */
import { z } from "zod";
import { centsToAmount, toCents } from "@/lib/format";
import { unitLabel, unitTypeLabels } from "@/lib/labels";
import type { Unit, UnitCreateBody, UnitStatus, UnitType, UnitUpdateBody } from "@/types/unit";

const UNIT_TYPES = Object.keys(unitTypeLabels) as [UnitType, ...UnitType[]];
/** The statuses a user may pick. OCCUPIED is set only by activating a lease. */
export const EDITABLE_STATUSES = ["VACANT", "RESERVED", "UNDER_MAINTENANCE"] as const satisfies readonly UnitStatus[];
/** monthlyRent: 0 or more, at most 99,999,999.99 (API.md, POST /units). */
const MAX_RENT_CENTS = 9_999_999_999;
/** floor and bathrooms are 32-bit integers: floor -2,147,483,648 to 2,147,483,647, bathrooms 0 to 2,147,483,647. */
const MIN_INT = -2_147_483_648;
const MAX_INT = 2_147_483_647;

/** The fields a backend message can name. */
export const UNIT_FIELDS = ["propertyId", "unitNumber", "unitType", "floorArea", "floor", "bathrooms", "monthlyRent", "status", "description"] as const;

const DECIMAL_RE = /^\d+(\.\d+)?$/;
const INT_RE = /^-?\d+$/;
const WHOLE_RE = /^\d+$/;

/** "" -> null, else the number. Only called after the regex check. */
const toNumberOrNull = (v: string) => (v === "" ? null : Number(v));

/**
 * Only the property, number and type are required. Rules from ../property-os-api/docs/frontend-handoff/rules.md (Units). Unit numbers are unique per property ignoring case
 * (backend 409); the form checks the same first (trimmed, case-insensitive, same property, never the unit itself).
 */
export function makeUnitSchema(units: Unit[], propertyName: (id: string) => string, editing?: Unit) {
  return z
    .object({
      propertyId: z.string().min(1, "Choose a property."),
      unitNumber: z.string().trim().min(1, "Enter the unit number."),
      unitType: z.string().min(1, "Choose a unit type.").pipe(z.enum(UNIT_TYPES)),
      floorArea: z
        .string()
        .trim()
        .refine((v) => v === "" || DECIMAL_RE.test(v), "Use a number, e.g. 750 or 750.5.")
        .refine((v) => v === "" || !DECIMAL_RE.test(v) || Number(v) > 0, "Floor area must be more than 0.")
        .transform(toNumberOrNull),
      floor: z
        .string()
        .trim()
        .refine((v) => v === "" || INT_RE.test(v), "Use a whole number, e.g. 3 or -1.")
        .refine((v) => v === "" || !INT_RE.test(v) || (Number(v) >= MIN_INT && Number(v) <= MAX_INT), "Floor must be between -2,147,483,648 and 2,147,483,647.")
        .transform(toNumberOrNull),
      bathrooms: z
        .string()
        .trim()
        .refine((v) => v === "" || WHOLE_RE.test(v), "Use a whole number, 0 or more.")
        .refine((v) => v === "" || !WHOLE_RE.test(v) || Number(v) <= MAX_INT, "Bathrooms can be at most 2,147,483,647.")
        .transform(toNumberOrNull),
      monthlyRent: z
        .union([z.number(), z.literal("")])
        .refine((v) => v === "" || toCents(v) <= MAX_RENT_CENTS, "Monthly rent can be at most $99,999,999.99.")
        // Empty is "not set"; 0 is a real rent.
        .transform((v) => (v === "" ? null : v)),
      status: z.string(),
      description: z.string().trim(),
    })
    .superRefine((v, ctx) => {
      const number = v.unitNumber.toLowerCase();
      const taken = units.some(
        (u) => u.propertyId === v.propertyId && u.id !== editing?.id && u.unitNumber.trim().toLowerCase() === number,
      );
      if (number && taken) {
        ctx.addIssue({ code: "custom", path: ["unitNumber"], message: `${unitLabel(v.unitNumber)} already exists in ${propertyName(v.propertyId)}.` });
      }
    });
}

export type UnitFormInput = z.input<ReturnType<typeof makeUnitSchema>>;
export type UnitFormOutput = z.output<ReturnType<typeof makeUnitSchema>>;

/** Form values from a unit, or an empty form on `propertyId`. */
export function unitDefaults(unit: Unit | undefined, propertyId: string): UnitFormInput {
  return {
    propertyId: unit?.propertyId ?? propertyId,
    unitNumber: unit?.unitNumber ?? "",
    unitType: unit?.unitType ?? "",
    floorArea: unit?.floorArea != null ? String(unit.floorArea) : "",
    floor: unit?.floor != null ? String(unit.floor) : "",
    bathrooms: unit?.bathrooms != null ? String(unit.bathrooms) : "",
    monthlyRent: unit?.monthlyRent != null ? centsToAmount(toCents(unit.monthlyRent)) : "",
    status: unit?.status ?? "VACANT",
    description: unit?.description ?? "",
  };
}

/** null and 0 differ: "not set" and a rent of $0. */
const centsOrNull = (value: string | number | null) => (value === null ? null : toCents(value));

/** POST body: optional fields only when filled. */
export function unitCreateBody(v: UnitFormOutput): UnitCreateBody {
  return {
    propertyId: v.propertyId,
    unitNumber: v.unitNumber,
    unitType: v.unitType,
    status: v.status as UnitCreateBody["status"],
    ...(v.floorArea !== null ? { floorArea: v.floorArea } : {}),
    ...(v.monthlyRent !== null ? { monthlyRent: v.monthlyRent } : {}),
    ...(v.floor !== null ? { floor: v.floor } : {}),
    ...(v.bathrooms !== null ? { bathrooms: v.bathrooms } : {}),
    ...(v.description ? { description: v.description } : {}),
  };
}

/** PATCH body with only the changed fields. floorArea, monthlyRent, floor, bathrooms, description: null when the user cleared them. Status only when editable. */
export function unitChanges(v: UnitFormOutput, u: Unit): UnitUpdateBody {
  const body: UnitUpdateBody = {};
  if (v.unitNumber !== u.unitNumber) body.unitNumber = v.unitNumber;
  if (v.unitType !== u.unitType) body.unitType = v.unitType;
  if (v.floorArea !== u.floorArea) body.floorArea = v.floorArea;
  if (v.floor !== u.floor) body.floor = v.floor;
  if (v.bathrooms !== u.bathrooms) body.bathrooms = v.bathrooms;
  if (centsOrNull(v.monthlyRent) !== centsOrNull(u.monthlyRent)) body.monthlyRent = v.monthlyRent;
  if (u.status !== "OCCUPIED" && v.status !== u.status) body.status = v.status as UnitUpdateBody["status"];
  if (v.description !== (u.description ?? "")) body.description = v.description === "" ? null : v.description;
  return body;
}
