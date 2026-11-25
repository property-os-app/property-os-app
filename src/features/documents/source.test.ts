import { describe, expect, it } from "vitest";
import { ownerOfDocument, sourceText } from "@/features/documents/source";
import type { DocumentRef, ListedDocument } from "@/types/document";

const doc = (over: Partial<ListedDocument> = {}) => ({ id: "d1", category: "RECEIPT", paymentId: null, paymentNumber: null, ...over }) as ListedDocument;
const unit: DocumentRef = { owner: "units", ownerId: "u1" };
const lease: DocumentRef = { owner: "leases", ownerId: "l1" };
const payment: DocumentRef = { owner: "payments", ownerId: "p1", leaseId: "l1" };
const fromLease = { type: "LEASE", leaseId: "l1", leaseNumber: "LSE-2026-021" } as const;
const fromUnit = { type: "UNIT", leaseId: null, leaseNumber: null } as const;
const ofPayment = { paymentId: "p1", paymentNumber: "PMT-2026-0108" };

describe("documents of a unit and its leases", () => {
  it("a lease's document belongs to the lease (delete path, category list, permission)", () => {
    const d = doc({ source: fromLease });
    expect(ownerOfDocument(d, unit)).toEqual(lease);
    expect(sourceText(d, unit)).toBe("Lease LSE-2026-021");
  });

  it("the unit's own document, and lists without sources, stay with their record", () => {
    expect(ownerOfDocument(doc({ source: fromUnit }), unit)).toEqual(unit);
    expect(sourceText(doc({ source: fromUnit }), unit)).toBe("Unit");
    expect(ownerOfDocument(doc(), { owner: "tenants", ownerId: "t1" })).toEqual({ owner: "tenants", ownerId: "t1" });
    expect(sourceText(doc(), { owner: "tenants", ownerId: "t1" })).toBeNull();
  });
});

describe("a payment's files", () => {
  it("in a lease's list: the payment route, and its number", () => {
    expect(ownerOfDocument(doc(ofPayment), lease)).toEqual(payment);
    expect(sourceText(doc(ofPayment), lease)).toBe("Payment PMT-2026-0108");
    expect(ownerOfDocument(doc(), lease)).toEqual(lease);
    expect(sourceText(doc(), lease)).toBeNull();
  });

  it("in a unit's list: the payment route of the source lease, both named", () => {
    const d = doc({ ...ofPayment, source: fromLease });
    expect(ownerOfDocument(d, unit)).toEqual(payment);
    expect(sourceText(d, unit)).toBe("Lease LSE-2026-021 · Payment PMT-2026-0108");
  });

  it("in the payment's own list: no source", () => {
    expect(ownerOfDocument(doc(ofPayment), payment)).toEqual(payment);
    expect(sourceText(doc(ofPayment), payment)).toBeNull();
  });
});
