import { describe, expect, it } from "vitest";
import { createExpenseBody, expenseChanges, expenseDefaults, expenseErrorField, expenseSchema, PORTFOLIO } from "@/features/expenses/form";
import type { Expense } from "@/types/expense";

const saved: Expense = {
  id: "e1",
  expenseNumber: "EXP-2026-0001",
  date: "2026-10-01",
  description: "Boiler repair",
  category: "REPAIRS",
  type: "OPERATING",
  amount: "640.00",
  reference: null,
  paymentMethod: null,
  notes: null,
  status: "PENDING_APPROVAL",
  propertyId: "p1",
  property: { id: "p1", name: "Maple Court" },
  unitId: "u1",
  unit: { id: "u1", unitNumber: "4B" },
  vendorId: null,
  vendor: null,
  createdById: "m1",
  createdBy: { id: "m1", name: "Manager" },
  approvedById: null,
  approvedBy: null,
  rejectedById: null,
  rejectedBy: null,
  voidedById: null,
  voidedBy: null,
  approvedAt: null,
  rejectedAt: null,
  voidedAt: null,
  rejectionReason: null,
  voided: false,
  voidReason: null,
  allowedActions: { edit: true, approve: false, reject: false, void: false, delete: true },
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
};

const parse = (over: Partial<ReturnType<typeof expenseDefaults>>) => expenseSchema.parse({ ...expenseDefaults(saved), ...over });

describe("createExpenseBody", () => {
  it("sends portfolio-wide without propertyId or unit, and the amount as a number", () => {
    const v = expenseSchema.parse({ ...expenseDefaults(), description: "Software", amount: 49.5, category: "OTHER", propertyId: PORTFOLIO, unitId: "u1" });
    const body = createExpenseBody(v);
    expect(body).toMatchObject({ description: "Software", amount: 49.5, category: "OTHER", type: "OPERATING" });
    expect(body).not.toHaveProperty("propertyId");
    expect(body).not.toHaveProperty("unitId");
  });
});

describe("expenseChanges", () => {
  it("is empty when nothing changed", () => {
    expect(expenseChanges(parse({}), saved)).toEqual({});
  });

  it("sends the type with a category change, so the server doesn't reset it", () => {
    expect(expenseChanges(parse({ category: "CAPITAL_IMPROVEMENTS", type: "OPERATING" }), saved)).toEqual({ category: "CAPITAL_IMPROVEMENTS", type: "OPERATING" });
    expect(expenseChanges(parse({ type: "CAPITAL" }), saved)).toEqual({ type: "CAPITAL" });
  });

  it("sends the unit with a property change, and null for portfolio-wide", () => {
    expect(expenseChanges(parse({ propertyId: "p2", unitId: "" }), saved)).toEqual({ propertyId: "p2", unitId: null });
    expect(expenseChanges(parse({ propertyId: PORTFOLIO, unitId: "u1" }), saved)).toEqual({ propertyId: null, unitId: null });
  });

  it("clears optional fields with null and compares money in cents", () => {
    const withNotes = { ...saved, notes: "Old", reference: "INV-1" };
    expect(expenseChanges(parse({ notes: "", reference: "", amount: 640 }), withNotes)).toEqual({ notes: null, reference: null });
  });
});

describe("expenseErrorField", () => {
  it("routes property, unit and vendor messages", () => {
    expect(expenseErrorField("Only the Owner can record expenses for all properties")).toBe("propertyId");
    expect(expenseErrorField("Unit u9 is not a unit of this expense's property")).toBe("unitId");
    expect(expenseErrorField('Vendor "Ridgeway" is archived, so it can\'t be picked for an expense. Unarchive it first.')).toBe("vendorId");
    expect(expenseErrorField("amount must be greater than 0")).toBe("amount");
    expect(expenseErrorField("This expense was changed by someone else at the same time. Please retry.")).toBeNull();
  });
});
