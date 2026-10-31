import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rentReminderLinks, type RentReminderInput } from "@/features/shared/rentReminder";

const input: RentReminderInput = {
  tenantName: "Grace Hopper",
  email: "grace@example.com",
  phone: "555-0100",
  propertyName: "Maple Court",
  unitNumber: "4B",
  overdue: "1200.00",
  dueDate: "2026-10-01",
  senderName: "Demo Owner",
};

/** The decoded body of the mailto link. */
const body = (p: RentReminderInput) => new URL(rentReminderLinks(p).mailto!).searchParams.get("body") ?? "";

describe("rentReminderLinks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-24T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("quotes the overdue amount, not the whole balance", () => {
    expect(body(input)).toContain("your rent of $1,200.00 for Maple Court 4B is 23 days overdue (due Oct 1, 2026)");
  });

  it("leaves the amount out when it is unknown", () => {
    expect(body({ ...input, overdue: null })).toContain("your rent for Maple Court 4B is 23 days overdue");
  });

  it("no email or phone: no links", () => {
    const links = rentReminderLinks({ ...input, email: null, phone: null });
    expect(links.mailto).toBeNull();
    expect(links.tel).toBeNull();
  });
});
