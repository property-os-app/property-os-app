import { describe, expect, it } from "vitest";
import {
  createTicketBody,
  resolutionChanges,
  resolveBody,
  ticketChanges,
  ticketDefaults,
  ticketErrorField,
  ticketSchema,
  type ResolveInput,
} from "@/features/maintenance/form";
import type { MaintenanceTicket } from "@/types/maintenance";

const ticket: MaintenanceTicket = {
  id: "t1",
  ticketNumber: 1042,
  title: "Leaking pipe",
  description: null,
  priority: "URGENT",
  status: "ASSIGNED",
  propertyId: "p1",
  property: { id: "p1", name: "Maple Court" },
  unitId: "u1",
  unit: { id: "u1", unitNumber: "7D" },
  locationNote: null,
  vendorId: "v1",
  vendor: { id: "v1", name: "Ace Plumbing", trade: "PLUMBING" },
  assignedAt: "2026-10-28T10:00:00.000Z",
  startedAt: null,
  resolvedAt: null,
  cancelledAt: null,
  estimatedCost: "1800.00",
  actualCost: null,
  expenses: [],
  resolutionNote: null,
  vendorRating: null,
  cancelReason: null,
  resolvedById: null,
  resolvedBy: null,
  cancelledById: null,
  cancelledBy: null,
  createdById: "o1",
  createdBy: { id: "o1", name: "Owner" },
  sla: { hours: 24, dueAt: "2026-10-29T10:00:00.000Z", pastSla: false },
  allowedActions: { edit: true, assign: true, unassign: true, start: true, resolve: true, reopen: false, cancel: false },
  createdAt: "2026-10-28T10:00:00.000Z",
  updatedAt: "2026-10-28T10:00:00.000Z",
};

const parse = (over: Partial<ReturnType<typeof ticketDefaults>> = {}) => ticketSchema.parse({ ...ticketDefaults(ticket), ...over });

describe("ticket form", () => {
  it("defaults: a new ticket on the scope, Normal", () => {
    expect(ticketDefaults(undefined, "p9")).toMatchObject({ propertyId: "p9", priority: "NORMAL", estimatedCost: "" });
    expect(ticketDefaults(ticket).estimatedCost).toBe(1800);
  });

  it("create body leaves out empty fields", () => {
    const v = ticketSchema.parse({ ...ticketDefaults(undefined, "p1"), title: " Broken door ", priority: "LOW" });
    expect(createTicketBody(v)).toEqual({ title: "Broken door", propertyId: "p1", priority: "LOW" });
    const full = ticketSchema.parse({
      ...ticketDefaults(undefined, "p1"),
      title: "Door",
      priority: "LOW",
      unitId: "u1",
      locationNote: "Exterior",
      vendorId: "v1",
      estimatedCost: 0,
    });
    expect(createTicketBody(full)).toEqual({
      title: "Door",
      propertyId: "p1",
      priority: "LOW",
      unitId: "u1",
      locationNote: "Exterior",
      vendorId: "v1",
      estimatedCost: 0,
    });
  });

  it("title is required and at most 150", () => {
    expect(ticketSchema.safeParse({ ...ticketDefaults(ticket), title: "  " }).success).toBe(false);
    expect(ticketSchema.safeParse({ ...ticketDefaults(ticket), title: "x".repeat(151) }).success).toBe(false);
  });

  it("changes: nothing when nothing changed", () => expect(ticketChanges(parse(), ticket)).toEqual({}));

  it("changes: cleared fields are null, money compared in cents", () => {
    expect(ticketChanges(parse({ estimatedCost: "" }), ticket)).toEqual({ estimatedCost: null });
    expect(ticketChanges(parse({ estimatedCost: 1800.0 }), ticket)).toEqual({});
    expect(ticketChanges(parse({ unitId: "", locationNote: "Common area" }), ticket)).toEqual({ unitId: null, locationNote: "Common area" });
  });

  it("changes: a property change also sends the unit", () => {
    expect(ticketChanges(parse({ propertyId: "p2", unitId: "" }), ticket)).toEqual({ propertyId: "p2", unitId: null });
  });

  it("changes: property and unit locked with linked expenses", () => {
    const linked = { ...ticket, expenses: [{ id: "e1", expenseNumber: "EXP-2026-0001", amount: "18.00", status: "APPROVED" as const, voided: false }] };
    expect(ticketChanges(parse({ propertyId: "p2", unitId: "" }), linked)).toEqual({});
  });

  it("resolved edit: note and rating only, rating only with a vendor", () => {
    expect(resolutionChanges({ resolutionNote: " Fixed ", vendorRating: 4 }, ticket)).toEqual({ resolutionNote: "Fixed", vendorRating: 4 });
    expect(resolutionChanges({ resolutionNote: "", vendorRating: 4 }, { ...ticket, vendorId: null })).toEqual({});
  });

  it("routes backend messages to fields", () => {
    expect(ticketErrorField("Unit u9 is not a unit of this ticket's property")).toBe("unitId");
    expect(ticketErrorField("Property p9 not found")).toBe("propertyId");
    expect(ticketErrorField('Vendor "Ace" is archived, so it can\'t be assigned to a ticket. Unarchive it first.')).toBe("vendorId");
    expect(ticketErrorField("title must be shorter than or equal to 150 characters")).toBe("title");
    expect(ticketErrorField("This ticket was changed by someone else at the same time. Please retry.")).toBeNull();
  });
});

describe("resolveBody", () => {
  const input: ResolveInput = { resolutionNote: " Replaced valve ", actualCost: 640, paymentMethod: "CHECK", reference: " INV-9 ", vendorRating: 4 };

  it("everything with a cost, a vendor and expenses.record", () => {
    expect(resolveBody(input, { canRecordCost: true, hasVendor: true })).toEqual({
      resolutionNote: "Replaced valve",
      actualCost: 640,
      paymentMethod: "CHECK",
      reference: "INV-9",
      vendorRating: 4,
    });
  });
  it("no cost fields without expenses.record", () => {
    expect(resolveBody(input, { canRecordCost: false, hasVendor: true })).toEqual({ resolutionNote: "Replaced valve", vendorRating: 4 });
  });
  it("no cost fields for $0 or empty", () => {
    expect(resolveBody({ ...input, actualCost: 0 }, { canRecordCost: true, hasVendor: true }).actualCost).toBeUndefined();
    expect(resolveBody({ ...input, actualCost: "" }, { canRecordCost: true, hasVendor: true }).paymentMethod).toBeUndefined();
  });
  it("no rating without a vendor; empty body is fine", () => {
    expect(resolveBody(input, { canRecordCost: true, hasVendor: false }).vendorRating).toBeUndefined();
    expect(
      resolveBody({ resolutionNote: "", actualCost: "", paymentMethod: "", reference: "", vendorRating: null }, { canRecordCost: true, hasVendor: true }),
    ).toEqual({});
  });
});
