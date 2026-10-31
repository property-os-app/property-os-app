/**
 * How much of a lease balance is overdue and how much isn't due yet, from its ledger. All money math in integer cents.
 * Rent is billed up to 28 days early (API.md, Billing), so a balance above $0 doesn't mean late. Until the API sends an
 * overdue amount (BACKEND REQUEST), it is worked out here: payments pay the oldest charges first, so what is still unpaid
 * is always the newest charges.
 */
import { todayUTC, toCents, type MoneyInput } from "@/lib/format";
import type { LedgerEntry } from "@/types/ledger";

export interface BalanceSplit {
  /** Unpaid charges due before today (UTC), the backend's overdue rule. */
  overdueCents: number;
  /** Unpaid charges due after today. */
  notDueCents: number;
}

/**
 * overdue = balance − the non-voided charges due today or later (never below 0); notDue = the charges due after today,
 * up to the balance. Both 0 when nothing is owed (balance ≤ 0).
 */
export function balanceSplit(entries: Pick<LedgerEntry, "kind" | "voided" | "date" | "amount">[], balance: MoneyInput, today = todayUTC()): BalanceSplit {
  const owed = toCents(balance);
  if (owed <= 0) return { overdueCents: 0, notDueCents: 0 };
  let fromToday = 0;
  let afterToday = 0;
  for (const e of entries) {
    if (e.kind !== "CHARGE" || e.voided || e.date < today) continue;
    const cents = toCents(e.amount);
    fromToday += cents;
    if (e.date > today) afterToday += cents;
  }
  return {
    overdueCents: Math.max(0, owed - fromToday),
    notDueCents: Math.min(owed, afterToday),
  };
}
