import { describe, expect, it } from "vitest";
import { bodyChanged, createTemplateBody, detailChanges, editorDefaults, editorSchema, templateErrorField } from "@/features/lease-templates/editorForm";
import type { LeaseTemplateDetail } from "@/types/leaseTemplate";

const saved: LeaseTemplateDetail = {
  id: "t1",
  name: "Standard Lease – 12-month",
  description: "Our usual lease",
  defaultTermMonths: 12,
  isDefault: true,
  archivedAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-20T10:00:00.000Z",
  currentVersion: 2,
  leaseCount: 3,
  currentVersionId: "v2",
  body: "# Lease\n\nRent: {{lease.rent}}",
  versions: [],
};

const parse = (over: Partial<ReturnType<typeof editorDefaults>>) => editorSchema.parse({ ...editorDefaults(saved), ...over });

describe("editorSchema", () => {
  it("trims and turns the term into a number or null", () => {
    expect(parse({ name: "  A  ", defaultTermMonths: " 6 " })).toMatchObject({ name: "A", defaultTermMonths: 6 });
    expect(parse({ defaultTermMonths: "" }).defaultTermMonths).toBeNull();
  });

  it("rejects a term outside 1–120 and an empty or blank text", () => {
    for (const term of ["0", "121", "1.5", "x"]) expect(editorSchema.safeParse({ ...editorDefaults(saved), defaultTermMonths: term }).success).toBe(false);
    expect(editorSchema.safeParse({ ...editorDefaults(saved), body: "   " }).success).toBe(false);
    expect(editorSchema.safeParse({ ...editorDefaults(saved), name: " " }).success).toBe(false);
  });
});

describe("createTemplateBody", () => {
  it("leaves out empty optional fields", () => {
    const v = editorSchema.parse({ ...editorDefaults(), name: "Short", body: "Hi" });
    expect(createTemplateBody(v)).toEqual({ name: "Short", body: "Hi" });
  });

  it("sends the term, description and default when set", () => {
    const v = editorSchema.parse({ name: "Short", description: "6 months", defaultTermMonths: "6", body: "Hi", isDefault: true });
    expect(createTemplateBody(v)).toEqual({ name: "Short", description: "6 months", defaultTermMonths: 6, body: "Hi", isDefault: true });
  });
});

describe("detailChanges", () => {
  it("is empty when nothing changed", () => {
    expect(detailChanges(parse({}), saved)).toEqual({});
  });

  it("sends only what changed; a cleared description or term is null", () => {
    expect(detailChanges(parse({ name: "New name" }), saved)).toEqual({ name: "New name" });
    expect(detailChanges(parse({ description: "", defaultTermMonths: "" }), saved)).toEqual({ description: null, defaultTermMonths: null });
  });

  it("never sends the body", () => {
    expect(detailChanges(parse({ body: "changed" }), saved)).toEqual({});
  });
});

describe("bodyChanged", () => {
  it("compares after trimming, like the backend", () => {
    expect(bodyChanged("  # Lease\n\nRent: {{lease.rent}}\n\n", saved)).toBe(false);
    expect(bodyChanged("# Lease", saved)).toBe(true);
  });
});

describe("templateErrorField", () => {
  it("routes the duplicate name, unknown fields and HTML messages", () => {
    expect(templateErrorField('A lease template named "Standard" already exists.')).toBe("name");
    expect(templateErrorField("Unknown merge fields: tenant.nickname")).toBe("body");
    expect(templateErrorField("Lease template body cannot contain HTML")).toBe("body");
    expect(templateErrorField("Another change to lease templates was saved at the same time. Please retry.")).toBeNull();
  });
});
