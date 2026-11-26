import { describe, expect, it } from "vitest";
import { signedCopies } from "@/features/documents/signed";

const doc = (id: string, category: string, createdAt: string, paymentId: string | null = null) => ({ id, category, createdAt, paymentId });

describe("signedCopies", () => {
  it("only the lease's own signed leases, newest first", () => {
    const docs = [
      doc("a", "SIGNED_LEASE", "2026-01-02T10:00:00.000Z"),
      doc("b", "ADDENDUM", "2026-03-01T10:00:00.000Z"),
      doc("c", "SIGNED_LEASE", "2026-02-01T10:00:00.000Z"),
      doc("d", "SIGNED_LEASE", "2026-04-01T10:00:00.000Z", "pay1"),
    ];
    expect(signedCopies(docs).map((d) => d.id)).toEqual(["c", "a"]);
  });

  it("none", () => {
    expect(signedCopies([doc("b", "OTHER", "2026-01-01T00:00:00.000Z")])).toEqual([]);
  });
});
