import { describe, expect, it } from "vitest";
import {
  addExistingTenant,
  addNewTenant,
  emptyOldLease,
  lastOldLeaseEnd,
  oldLeaseBody,
  oldLeaseErrorField,
  oldLeaseRequest,
  oldLeaseServerErrors,
  removeTenant,
  swapForExisting,
  validateOldLease,
  type NewTenantRow,
  type OldLeaseTenant,
  type OldLeaseValues,
} from "@/features/leases/oldLeaseForm";

const TODAY = "2026-11-21";
const person = (id: string) => ({ id, fullName: `Tenant ${id}`, email: null, phone: null });
const existing = (id: string): OldLeaseTenant => ({ ...person(id), kind: "existing", key: `tenant-${id}` });
const fresh = (n: number, over: Partial<NewTenantRow> = {}): NewTenantRow => ({ kind: "new", key: `new-${n}`, fullName: `New ${n}`, email: "", phone: "", ...over });
const filled = (over: Partial<OldLeaseValues> = {}): OldLeaseValues => ({
  ...emptyOldLease({ propertyId: "p1", unitId: "u1" }),
  tenants: [existing("t1")],
  primaryKey: "tenant-t1",
  startDate: "2019-01-01",
  endDate: "2019-12-31",
  ...over,
});

describe("tenant rows: exactly one primary", () => {
  it("a single tenant is ticked by itself, a second one changes nothing", () => {
    const one = addNewTenant(emptyOldLease(), 1);
    expect(one.primaryKey).toBe("new-1");
    expect(addExistingTenant(one, person("t1"))).toMatchObject({ primaryKey: "new-1", tenants: [{ key: "new-1" }, { key: "tenant-t1" }] });
  });

  it("a tenant can't be listed twice", () => {
    const v = addExistingTenant(emptyOldLease(), person("t1"));
    expect(addExistingTenant(v, person("t1")).tenants).toHaveLength(1);
  });

  it("removing the primary: the only one left is ticked, else the user chooses", () => {
    const three = { tenants: [existing("t1"), existing("t2"), fresh(1)], primaryKey: "tenant-t1" };
    const two = removeTenant(three, "tenant-t1");
    expect(two.primaryKey).toBe("");
    expect(removeTenant(two, "new-1").primaryKey).toBe("tenant-t2");
    expect(removeTenant(three, "new-1").primaryKey).toBe("tenant-t1");
  });

  it("use existing tenant: swaps the new row in place and keeps Primary", () => {
    const v = { tenants: [existing("t1"), fresh(1), fresh(2)], primaryKey: "new-1" };
    const next = swapForExisting(v, "new-1", person("t9"));
    expect(next.tenants.map((t) => t.key)).toEqual(["tenant-t1", "tenant-t9", "new-2"]);
    expect(next.primaryKey).toBe("tenant-t9");
    expect(swapForExisting(v, "new-2", person("t9")).primaryKey).toBe("new-1");
  });

  it("use existing tenant who is listed already: the new row goes and its Primary moves", () => {
    const next = swapForExisting({ tenants: [existing("t1"), existing("t2"), fresh(1)], primaryKey: "new-1" }, "new-1", person("t2"));
    expect(next.tenants.map((t) => t.key)).toEqual(["tenant-t1", "tenant-t2"]);
    expect(next.primaryKey).toBe("tenant-t2");
  });
});

describe("validateOldLease", () => {
  it("accepts a complete old lease, with an existing or a new tenant", () => {
    expect(validateOldLease(filled(), TODAY)).toEqual({});
    expect(validateOldLease(filled({ tenants: [fresh(1)], primaryKey: "new-1" }), TODAY)).toEqual({});
  });

  it("needs a unit, a tenant and both dates", () => {
    expect(validateOldLease(emptyOldLease(), TODAY)).toEqual({
      unitId: "Choose a unit.",
      tenants: "Add at least one tenant.",
      startDate: "Enter the start date.",
      endDate: "Enter the end date.",
    });
  });

  it("needs one primary and at most 10 tenants", () => {
    expect(validateOldLease(filled({ primaryKey: "" }), TODAY).tenants).toBe("Choose the primary tenant.");
    const many = Array.from({ length: 11 }, (_, i) => fresh(i));
    expect(validateOldLease(filled({ tenants: many, primaryKey: "new-0" }), TODAY).tenants).toBe("A lease can have at most 10 tenants.");
    expect(validateOldLease(filled({ tenants: many.slice(1), primaryKey: "new-1" }), TODAY).tenants).toBeUndefined();
  });

  it("new tenants: a name, a valid email when filled, no email twice", () => {
    const tenants = [fresh(1, { fullName: " " }), fresh(2, { email: "ann" }), fresh(3, { email: "bo@example.com" }), fresh(4, { email: " BO@example.com " })];
    expect(validateOldLease(filled({ tenants, primaryKey: "new-1" }), TODAY).newTenants).toEqual({
      "new-1": { fullName: "Enter the full name." },
      "new-2": { email: "Enter a valid email, e.g. name@example.com." },
      "new-4": { email: "Another new tenant has this email." },
    });
  });

  it("the end date must be before today (UTC) and after the start", () => {
    expect(validateOldLease(filled({ endDate: TODAY }), TODAY).endDate).toBe("An old lease must end before today.");
    expect(validateOldLease(filled({ endDate: "2026-11-20" }), TODAY).endDate).toBeUndefined();
    expect(validateOldLease(filled({ startDate: "2019-12-31" }), TODAY).endDate).toBe("The end date must be after the start date.");
    expect(validateOldLease(filled({ startDate: "2020-01-01" }), TODAY).endDate).toBe("The end date must be after the start date.");
  });

  it("lastOldLeaseEnd is yesterday", () => {
    expect(lastOldLeaseEnd(TODAY)).toBe("2026-11-20");
    expect(lastOldLeaseEnd("2026-03-01")).toBe("2026-02-28");
  });
});

describe("oldLeaseBody", () => {
  it("sends only the required fields when nothing else is filled", () => {
    expect(oldLeaseBody(filled())).toEqual({ unitId: "u1", primaryTenantId: "t1", startDate: "2019-01-01", endDate: "2019-12-31" });
  });

  it("a new primary: isPrimary on its row, existing tenants are co-tenants, no primaryTenantId", () => {
    const tenants = [existing("t1"), fresh(1, { fullName: " Ann Lee ", email: " ann@example.com " }), fresh(2, { phone: "555" })];
    expect(oldLeaseBody(filled({ tenants, primaryKey: "new-1" }))).toEqual({
      unitId: "u1",
      startDate: "2019-01-01",
      endDate: "2019-12-31",
      coTenantIds: ["t1"],
      newTenants: [
        { fullName: "Ann Lee", email: "ann@example.com", isPrimary: true },
        { fullName: "New 2", phone: "555" },
      ],
    });
  });

  it("adds the optional fields when filled; never the property, status or e-sign", () => {
    const body = oldLeaseBody(filled({ tenants: [existing("t1"), existing("t2")], rent: 950, deposit: 0, notes: "  Paper files  ", tags: ["Paper Lease"] }));
    expect(body).toEqual({
      unitId: "u1",
      primaryTenantId: "t1",
      coTenantIds: ["t2"],
      startDate: "2019-01-01",
      endDate: "2019-12-31",
      rent: 950,
      deposit: 0,
      notes: "Paper files",
      tags: ["Paper Lease"],
    });
    expect(Object.keys(body)).not.toContain("propertyId");
  });

  it("sends the pet deposit when filled, and checks its limit", () => {
    expect(oldLeaseBody(filled({ petDeposit: 300 })).petDeposit).toBe(300);
    expect(oldLeaseBody(filled({ petDeposit: "" }))).not.toHaveProperty("petDeposit");
    expect(oldLeaseErrorField("petDeposit must not be less than 0", 400)).toBe("petDeposit");
  });

  it("leaves blank notes out", () => {
    expect(oldLeaseBody(filled({ notes: "   " })).notes).toBeUndefined();
  });
});

describe("oldLeaseRequest", () => {
  it("data as JSON text, and the file only when there is one", () => {
    const body = oldLeaseBody(filled());
    expect([...oldLeaseRequest(body, null).keys()]).toEqual(["data"]);
    const form = oldLeaseRequest(body, new File(["%PDF-1.4"], "lease.pdf", { type: "application/pdf" }));
    expect([...form.keys()]).toEqual(["data", "file"]);
    expect(JSON.parse(String(form.get("data")))).toEqual(body);
    expect((form.get("file") as File).name).toBe("lease.pdf");
  });
});

describe("backend errors", () => {
  const rows = [existing("t1"), fresh(1, { email: "ann@example.com" }), fresh(2, { email: "Ann@example.com" })];
  const err = (messages: string[], over: object = {}) => oldLeaseServerErrors({ status: 400, messages, ...over }, rows);

  it("409 TENANT_EMAIL_EXISTS goes under that new tenant, with the existing one", () => {
    const tenant = { id: "t7", fullName: "Sample Tenant" };
    const details = { code: "TENANT_EMAIL_EXISTS", tenant, newTenantIndex: 1 };
    expect(err(["A tenant with email x already exists: Sample Tenant."], { status: 409, code: "TENANT_EMAIL_EXISTS", details })).toEqual({
      errors: { newTenants: { "new-2": { email: "Sample Tenant already has this email.", existing: tenant } } },
      top: "",
    });
  });

  it("a 409 without usable details still shows its message", () => {
    expect(err(["A tenant with email x already exists: Sample Tenant."], { status: 409, code: "TENANT_EMAIL_EXISTS", details: {} }).top).toContain("already exists");
  });

  it("newTenants.N messages go under that row", () => {
    expect(err(["newTenants.0.email must be an email", "newTenants.1.fullName should not be empty"]).errors.newTenants).toEqual({
      "new-1": { email: "Enter a valid email, e.g. name@example.com." },
      "new-2": { fullName: "Full name should not be empty" },
    });
    expect(err(["newTenants has the same email twice: ann@example.com"]).errors.newTenants).toEqual({ "new-2": { email: "Another new tenant has this email." } });
  });

  it("dates and the overlap under End date", () => {
    expect(oldLeaseErrorField("endDate must be before today for a history-only lease", 400)).toBe("endDate");
    expect(oldLeaseErrorField("Unit already has a lease (LSE-2026-003, ACTIVE, 2026-01-01 to 2026-12-31) overlapping these dates. Change the dates.", 400)).toBe("endDate");
  });

  it("tenant messages under the section, file messages under the file, the rest at the top", () => {
    expect(oldLeaseErrorField("Exactly one tenant must be primary: set primaryTenantId or isPrimary on one new tenant", 400)).toBe("tenants");
    expect(oldLeaseErrorField("At least one tenant is required (primaryTenantId, coTenantIds or newTenants)", 400)).toBe("tenants");
    expect(oldLeaseErrorField("Tenant(s) not found: t1", 400)).toBe("tenants");
    expect(oldLeaseErrorField("file is empty", 400)).toBe("file");
    expect(err(["File too large"], { status: 413 }).errors.file).toBe("File too large");
    expect(err(["Password-protected files are not supported"], { status: 415 })).toEqual({ errors: { file: "Password-protected files are not supported" }, top: "" });
    expect(err(["You do not have access to this property"], { status: 403 })).toEqual({ errors: {}, top: "You do not have access to this property" });
  });
});
