import { describe, expect, it } from "vitest";
import { tenantChanges, tenantCreateBody, tenantDefaults, tenantSchema, type TenantFormInput } from "@/features/tenants/form";
import type { TenantDetail } from "@/types/tenant";

const input = (over: Partial<TenantFormInput> = {}): TenantFormInput => ({ ...tenantDefaults(), fullName: "Ann Lee", ...over });
const message = (over: Partial<TenantFormInput>) => tenantSchema.safeParse(input(over)).error?.issues[0]?.message;

const saved = {
  id: "t1",
  fullName: "Ann Lee",
  email: "ann@example.com",
  phone: "555-0100",
  idNumber: null,
  address: null,
  tenantType: "INDIVIDUAL",
  moveInDate: null,
  preferredContactMethod: "EMAIL",
  notes: null,
} as TenantDetail;
const changes = (t: TenantDetail, over: Partial<TenantFormInput>) => tenantChanges(tenantSchema.parse({ ...tenantDefaults(t), ...over }), t);

describe("tenant form: optional email and phone", () => {
  it("only the name is required, and empty ones aren't sent", () => {
    expect(tenantCreateBody(tenantSchema.parse(input()))).toEqual({ fullName: "Ann Lee", tenantType: "INDIVIDUAL", preferredContactMethod: "EMAIL" });
    expect(message({ fullName: "  " })).toBe("Enter the full name.");
  });

  it("an email must still be valid when filled", () => {
    expect(message({ email: "ann" })).toBe("Enter a valid email, e.g. name@example.com.");
    expect(message({ email: "   " })).toBeUndefined();
    expect(tenantCreateBody(tenantSchema.parse(input({ email: " ann@example.com ", phone: " 555 " })))).toMatchObject({ email: "ann@example.com", phone: "555" });
  });

  it("clearing sends null", () => {
    expect(changes(saved, { email: "", phone: " " })).toEqual({ email: null, phone: null });
  });

  it("a tenant without them: untouched sends nothing, filling sends the text", () => {
    const bare = { ...saved, email: null, phone: null };
    expect(changes(bare, {})).toEqual({});
    expect(changes(bare, { phone: "555" })).toEqual({ phone: "555" });
  });
});
