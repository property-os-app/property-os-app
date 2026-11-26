/** The ledger cards and payment allocations as the screen shows them. No React, so it is unit-testable. */
import { formatCurrency, isMonth, toCents } from "@/lib/format";
import type { LedgerCard, LedgerPaymentAllocation, LedgerResponse } from "@/types/ledger";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** One month of cards, with its totals over the non-voided cards. */
export interface CardMonth {
  /** "YYYY-MM". */
  month: string;
  /** The API order (due date, then created): rent before that month's late fee. */
  cards: LedgerCard[];
  charged: string;
  paid: string;
  remaining: string;
}

/** Cards grouped by `month`, newest month first; inside a month the API order is kept. Voided cards don't count in the totals. */
export function groupCardsByMonth(cards: readonly LedgerCard[]): CardMonth[] {
  const byMonth = new Map<string, LedgerCard[]>();
  for (const c of cards) byMonth.set(c.month, [...(byMonth.get(c.month) ?? []), c]);
  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, list]) => {
      const live = list.filter((c) => c.status !== "VOID");
      // Money strings (fixed 2) from whole cents, like the API sends.
      const sum = (pick: (c: LedgerCard) => string) => (live.reduce((n, c) => n + toCents(pick(c)), 0) / 100).toFixed(2);
      return { month, cards: list, charged: sum((c) => c.amount), paid: sum((c) => c.paid), remaining: sum((c) => c.remaining) };
    });
}

/** "Oct rent", "Oct late fee", "Nov 2025 rent" (the year only when it isn't `year`), or the description of an OTHER charge. */
export function cardLabel(card: Pick<LedgerCard, "type" | "month" | "description">, year?: string): string {
  if (card.type === "OTHER" || !isMonth(card.month)) return card.description;
  const name = SHORT_MONTHS[Number(card.month.slice(5, 7)) - 1];
  const when = year && card.month.slice(0, 4) !== year ? `${name} ${card.month.slice(0, 4)}` : name;
  return `${when} ${card.type === "RENT" ? "rent" : "late fee"}`;
}

/** One part of a payment's "Paid: …" line; `chargeId` is null for the credit part. */
export interface AllocationPart {
  chargeId: string | null;
  text: string;
}

/**
 * What a payment paid, in parts: "Oct rent $600.00", "Nov rent $600.00", then "+ $50.00 credit" when some is left.
 * Charges missing from `cards` fall back to their invoice number. A voided payment has no parts (see `allocationText`).
 */
export function allocationParts(allocation: LedgerPaymentAllocation, cards: readonly LedgerCard[]): AllocationPart[] {
  if (allocation.voided) return [];
  const year = allocation.date.slice(0, 4);
  const parts: AllocationPart[] = allocation.applied.map((a) => {
    const card = cards.find((c) => c.chargeId === a.chargeId);
    return { chargeId: a.chargeId, text: `${card ? cardLabel(card, year) : a.invoiceNumber} ${formatCurrency(a.amount)}` };
  });
  if (toCents(allocation.unapplied) > 0) parts.push({ chargeId: null, text: `+ ${formatCurrency(allocation.unapplied)} credit` });
  return parts;
}

/** "Paid: Oct rent $600.00, Nov rent $600.00 + $50.00 credit"; "Voided: paid nothing"; "Paid ahead: $50.00 credit" when nothing was open. */
export function allocationText(allocation: LedgerPaymentAllocation, cards: readonly LedgerCard[]): string {
  if (allocation.voided) return "Voided: paid nothing";
  const parts = allocationParts(allocation, cards);
  const charges = parts.filter((p) => p.chargeId !== null).map((p) => p.text);
  const credit = parts.find((p) => p.chargeId === null)?.text;
  if (charges.length === 0) return credit ? `Paid ahead: ${credit.slice(2)}` : "Paid: nothing yet";
  return `Paid: ${charges.join(", ")}${credit ? ` ${credit}` : ""}`;
}

/** The payment's allocation, by payment id. */
export function allocationOf(ledger: Pick<LedgerResponse, "paymentAllocations"> | undefined, paymentId: string): LedgerPaymentAllocation | undefined {
  return ledger?.paymentAllocations?.find((a) => a.paymentId === paymentId);
}

/** The credit (money paid ahead) when there is one, else null. Uses `summary.credit`, never the balance's sign. */
export function creditAmount(summary: { credit?: string } | undefined): string | null {
  return summary?.credit && toCents(summary.credit) > 0 ? summary.credit : null;
}

/** "Credit $50.00" when there is a credit, else the balance ("$1,200.00"). */
export function balanceOrCreditText(summary: { balance: string; credit?: string }): string {
  const credit = creditAmount(summary);
  return credit ? `Credit ${formatCurrency(credit)}` : formatCurrency(summary.balance);
}
