/**
 * Ending a lease, without React (unit-testable): the preview's rows, the deposit cap after the voids, the POST /leases/:id/end
 * body and the success toast. Rules: rules.md "Leases" (End) and API.md GET /leases/:id/end-preview, POST /leases/:id/end.
 */
import { formatCurrency, formatMonth, toCents, type MoneyInput } from "@/lib/format";
import { plural } from "@/lib/labels";
import type { DepositBody, DepositStatus, EndPreview, EndPreviewCharge } from "@/types/deposit";
import type { Lease, LeaseEndBody, LeaseEnded } from "@/types/lease";

/** Integer cents -> an API-style money string ("2850.00", "-50.00"), with no float math. */
export function centsText(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const text = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? `-${text}` : text;
}

/** One line of a preview list. `paidNote`: "paid $X → becomes credit" when part of it was paid (a voided paid charge becomes credit). */
export interface PreviewRow {
  chargeId: string;
  month: string;
  invoiceNumber: string;
  description: string;
  amount: string;
  paidNote: string | null;
}

export function previewRows(charges: EndPreviewCharge[]): PreviewRow[] {
  return charges.map((c) => ({
    chargeId: c.chargeId,
    month: formatMonth(c.month),
    invoiceNumber: c.invoiceNumber,
    description: c.description,
    amount: formatCurrency(c.amount),
    paidNote: toCents(c.paid) > 0 ? `paid ${formatCurrency(c.paid)} → becomes credit` : null,
  }));
}

/** Total of a list, as a money string. */
export function chargesTotal(charges: EndPreviewCharge[]): string {
  return centsText(charges.reduce((sum, c) => sum + toCents(c.amount), 0));
}

/** min(totalHeld, max(balance, 0)) as a money string: what a settlement may apply. */
export function applicableCap(totalHeld: MoneyInput, balance: MoneyInput): string {
  const cap = Math.min(toCents(totalHeld), Math.max(toCents(balance), 0));
  return centsText(cap);
}

/**
 * The "Apply to unpaid balance" limit inside End lease. The API ends, then voids, then settles: with the voids ticked the
 * tenant owes balanceAfterVoid, else balanceNow.
 */
export function endMaxApplicable(preview: Pick<EndPreview, "balanceNow" | "balanceAfterVoid" | "deposit">, voiding: boolean): string {
  return applicableCap(preview.deposit.totalHeld, voiding ? preview.balanceAfterVoid : preview.balanceNow);
}

/** The balance the tenant will owe after ending, with or without the voids. */
export const balanceAfterEnd = (preview: Pick<EndPreview, "balanceNow" | "balanceAfterVoid">, voiding: boolean) => (voiding ? preview.balanceAfterVoid : preview.balanceNow);

export interface EndChoices {
  /** The lease hasn't started: no status choice shown, no endedOn sent. */
  cancels: boolean;
  status: "ENDED" | "TERMINATED";
  endedOn: string;
  /** The "Void these charges" checkbox (only sent when the user may void and there is something to void). */
  voidCharges: boolean;
  /** The settlement, when "Settle the deposit now" is on. */
  deposit: DepositBody | null;
}

/** POST /leases/:id/end body. Never null: fields that don't apply are left out. */
export function endBody(c: EndChoices): LeaseEndBody {
  const body: LeaseEndBody = c.cancels ? { status: "ENDED" } : { status: c.status, endedOn: c.endedOn };
  if (c.voidCharges) body.voidChargesAfterEnd = true;
  if (c.deposit) body.deposit = c.deposit;
  return body;
}

/** "Lease LSE-2026-006 ended · 3 charges voided · deposit settled" (cancelled / terminated, and only the parts that happened). */
export function endToast(saved: Pick<LeaseEnded, "leaseNumber" | "status" | "cancelledOn" | "voidedCharges" | "depositSettlement">): string {
  const verb = saved.cancelledOn ? "cancelled" : saved.status === "TERMINATED" ? "terminated" : "ended";
  const parts = [`Lease ${saved.leaseNumber} ${verb}`];
  const voided = saved.voidedCharges?.length ?? 0;
  if (voided > 0) parts.push(`${plural(voided, "charge")} voided`);
  if (saved.depositSettlement) parts.push("deposit settled");
  return parts.join(" · ");
}

/** The earliest settledOn the API accepts: endedOn, else cancelledOn, else startDate. */
export function settledOnMin(lease: Pick<Lease, "endedOn" | "cancelledOn" | "startDate">): string | null {
  return lease.endedOn ?? lease.cancelledOn ?? lease.startDate;
}

/** security + pet deposit of a lease, as a money string ("0.00" without either). */
export function leaseDepositTotal(lease: Pick<Lease, "deposit" | "petDeposit">): string {
  return centsText(toCents(lease.deposit) + toCents(lease.petDeposit));
}

/** The badge key: the API status, NOT_TRACKED for an ended lease with a deposit and no status, null without a deposit or on a draft. */
export function depositBadge(status: DepositStatus | null, totalHeld: MoneyInput, leaseStatus: Lease["status"]): DepositStatus | "NOT_TRACKED" | null {
  if (status) return status;
  if (leaseStatus === "DRAFT" || toCents(totalHeld) === 0) return null;
  return "NOT_TRACKED";
}
