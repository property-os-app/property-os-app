import { describe, expect, it } from "vitest";
import { createBody, defaults, schema, stepOf, updateBody } from "@/features/leases/form";
import type { Lease } from "@/types/lease";

const lease: Lease = {
  id: "l1",
  leaseNumber: "LSE-2026-006",
  unitId: "u1",
  status: "ACTIVE",
  signatureStatus: "SIGNED",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  endedOn: null,
  cancelledOn: null,
  paymentFrequency: "MONTHLY",
  rent: "1200.00",
  deposit: "1200.00",
  petDeposit: "300.00",
  depositStatus: "HELD",
  lateFeeAmount: "0.00",
  lateFeeGraceDays: 5,
  rentDueDay: 1,
  autoRenew: false,
  isHistorical: false,
  tags: [],
  notes: null,
  templateVersionId: null,
  createdById: "u",
  createdAt: "",
  updatedAt: "",
  unit: { id: "u1", unitNumber: "4B", property: { id: "p1", name: "Oak" } },
  template: null,
  tenants: [{ id: "t1", fullName: "Ana", email: null, isPrimary: true }],
  termMonths: 12,
  endingSoon: false,
  balance: "0.00",
  oldestUnpaidDueDate: null,
};

const parse = (over: Partial<ReturnType<typeof defaults>> = {}, from: Lease = lease) => schema.parse({ ...defaults({ lease: from }), ...over });

describe("pet deposit", () => {
  it("is on the Deposit step", () => {
    expect(stepOf("petDeposit")).toBe(2);
  });

  it("is prefilled from the lease and unchanged means not sent", () => {
    expect(defaults({ lease }).petDeposit).toBe(300);
    expect(updateBody(parse(), lease)).toEqual({});
  });

  it("is sent when changed, and null when cleared (DRAFT and ACTIVE)", () => {
    expect(updateBody(parse({ petDeposit: 350 }), lease)).toEqual({ petDeposit: 350 });
    expect(updateBody(parse({ petDeposit: "" }), lease)).toEqual({ petDeposit: null });
    expect(updateBody(parse({ petDeposit: "" }), { ...lease, status: "DRAFT" })).toEqual({ petDeposit: null });
  });

  it("is locked once the lease has ended", () => {
    expect(updateBody(parse({ petDeposit: 999 }, { ...lease, status: "ENDED" }), { ...lease, status: "ENDED" })).toEqual({});
  });

  it("is only sent on create when filled", () => {
    expect(createBody(parse({ petDeposit: 250 }), false).petDeposit).toBe(250);
    expect(createBody(parse({ petDeposit: "" }), false)).not.toHaveProperty("petDeposit");
  });

  it("can be at most $9,999,999,999.99", () => {
    expect(schema.safeParse({ ...defaults({ lease }), petDeposit: 10_000_000_000 }).success).toBe(false);
  });
});
