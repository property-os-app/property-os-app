import { describe, expect, it } from "vitest";
import { ownerOfDocument, sourceText } from "@/features/documents/source";
import type { ListedDocument } from "@/types/document";

const doc = (source?: ListedDocument["source"]) => ({ id: "d1", category: "SIGNED_LEASE", source }) as ListedDocument;
const unit = { owner: "units", ownerId: "u1" } as const;

describe("documents of a unit and its leases", () => {
  it("a lease's document belongs to the lease (delete path, category list, permission)", () => {
    const d = doc({ type: "LEASE", leaseId: "l1", leaseNumber: "LSE-2026-021" });
    expect(ownerOfDocument(d, unit)).toEqual({ owner: "leases", ownerId: "l1" });
    expect(sourceText(d)).toBe("Lease LSE-2026-021");
  });

  it("the unit's own document, and lists without sources, stay with their record", () => {
    const d = doc({ type: "UNIT", leaseId: null, leaseNumber: null });
    expect(ownerOfDocument(d, unit)).toEqual(unit);
    expect(sourceText(d)).toBe("Unit");
    expect(ownerOfDocument(doc(), { owner: "tenants", ownerId: "t1" })).toEqual({ owner: "tenants", ownerId: "t1" });
    expect(sourceText(doc())).toBeNull();
  });
});
