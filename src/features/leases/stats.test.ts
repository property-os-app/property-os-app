import { describe, expect, it } from "vitest";
import { autoRenewEditable, balanceTone, balanceToneClass, balanceValueText, canDeleteLease, coTenantEmails, dueState, hasLedger, isOldLease, notDueCaption } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

const TODAY = "2026-10-24";

/** Only the fields dueState reads matter. */
const lease = (balance: string, oldestUnpaidDueDate: string | null) => ({ balance, oldestUnpaidDueDate }) as Lease;

describe("dueState: a balance above $0 is not late by itself", () => {
  it("rent billed early (due later) is not overdue", () => {
    expect(dueState(lease("1200.00", "2026-11-01"), TODAY)).toEqual({
      kind: "future",
      next: "2026-11-01",
    });
  });

  it("overdue only when the oldest unpaid due date is before today (UTC)", () => {
    expect(dueState(lease("1200.00", "2026-10-23"), TODAY)).toEqual({
      kind: "overdue",
      since: "2026-10-23",
    });
    expect(dueState(lease("1200.00", TODAY), TODAY)).toEqual({ kind: "today" });
  });

  it("credit and nothing owed", () => {
    expect(dueState(lease("-50.00", null), TODAY)).toEqual({ kind: "credit" });
    expect(dueState(lease("0.00", null), TODAY)).toEqual({ kind: "none" });
  });
});

describe("coTenantEmails", () => {
  it("leaves out the primary and co-tenants without an email", () => {
    const t = (fullName: string, email: string | null, isPrimary = false) => ({ id: fullName, fullName, email, isPrimary });
    expect(coTenantEmails({ tenants: [t("Ann", "ann@example.com", true), t("Bo", null), t("Cy", "cy@example.com")] })).toEqual(["cy@example.com"]);
    expect(coTenantEmails({ tenants: [t("Ann", null, true)] })).toEqual([]);
  });
});

describe("notDueCaption", () => {
  it('"Due Nov 1" when nothing is late yet', () => {
    expect(notDueCaption(lease("1200.00", "2026-11-01"), TODAY)).toBe("Due Nov 1");
    expect(notDueCaption(lease("1200.00", TODAY), TODAY)).toBe("Due today");
  });

  it("null when overdue, credit or nothing owed", () => {
    expect(notDueCaption(lease("1200.00", "2026-10-01"), TODAY)).toBeNull();
    expect(notDueCaption(lease("-50.00", null), TODAY)).toBeNull();
    expect(notDueCaption(lease("0.00", null), TODAY)).toBeNull();
  });
});

describe("old (history-only) lease rules", () => {
  const old = { status: "ENDED", isHistorical: true } as const;
  const ended = { status: "ENDED", isHistorical: false } as const;
  const draft = { status: "DRAFT", isHistorical: false } as const;
  const active = { status: "ACTIVE", isHistorical: false } as const;

  it("isOldLease follows isHistorical", () => {
    expect(isOldLease(old)).toBe(true);
    expect(isOldLease(ended)).toBe(false);
  });

  it("no ledger on a draft or an old lease", () => {
    expect(hasLedger(old)).toBe(false);
    expect(hasLedger(draft)).toBe(false);
    expect(hasLedger(active)).toBe(true);
    expect(hasLedger(ended)).toBe(true);
  });

  it("delete only drafts and old leases, and only with no documents", () => {
    expect(canDeleteLease(old, 0)).toBe(true);
    expect(canDeleteLease(old, 1)).toBe(false);
    expect(canDeleteLease(old, undefined)).toBe(false);
    expect(canDeleteLease(draft, 0)).toBe(true);
    expect(canDeleteLease(draft, 2)).toBe(false);
    expect(canDeleteLease(ended, 0)).toBe(false);
    expect(canDeleteLease(active, 0)).toBe(false);
  });
});

describe("autoRenewEditable", () => {
  it("DRAFT and ACTIVE only, never an old lease", () => {
    expect(autoRenewEditable({ status: "DRAFT", isHistorical: false })).toBe(true);
    expect(autoRenewEditable({ status: "ACTIVE", isHistorical: false })).toBe(true);
    expect(autoRenewEditable({ status: "ENDED", isHistorical: false })).toBe(false);
    expect(autoRenewEditable({ status: "TERMINATED", isHistorical: false })).toBe(false);
    expect(autoRenewEditable({ status: "ENDED", isHistorical: true })).toBe(false);
  });
});

describe("balance colour and text (lease page, tenant and unit pages, Current lease cards)", () => {
  const tone = (balance: string, due: string | null, credit: string | null = null) => balanceTone(dueState(lease(balance, due), TODAY), credit);

  it("$0.00 and a credit are green, owed but not late orange, overdue red", () => {
    expect(tone("0.00", null)).toBe("success");
    expect(tone("1200.00", "2026-11-01")).toBe("warning");
    expect(tone("1200.00", TODAY)).toBe("warning");
    expect(tone("1200.00", "2026-10-01")).toBe("danger");
    expect(tone("-150.00", null)).toBe("success");
    expect(tone("0.00", null, "150.00")).toBe("success");
    expect(balanceToneClass).toEqual({ success: "text-success", warning: "text-warning", danger: "text-danger" });
  });

  it("shows a credit as \"Credit $X\" and money owed without a sign", () => {
    expect(balanceValueText("1200.00")).toBe("$1,200.00");
    expect(balanceValueText("0.00")).toBe("$0.00");
    expect(balanceValueText("-6440.00")).toBe("Credit $6,440.00");
    expect(balanceValueText("-6440.00", "6440.00")).toBe("Credit $6,440.00");
    expect(balanceValueText("0.00", "0.00")).toBe("$0.00");
  });
});
