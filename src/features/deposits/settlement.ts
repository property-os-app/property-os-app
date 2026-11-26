/**
 * The deposit settlement form, without React (unit-testable): starting values, the "left to assign" math (integer cents), the
 * checks, the PUT /leases/:id/deposit body and where each backend message goes. Rules: rules.md "Deposits", API.md PUT /leases/:id/deposit.
 */
import { centsToAmount, formatCurrency, formatDate, parseDateOnly, toCents } from "@/lib/format";
import type { DepositBody, DepositResponse } from "@/types/deposit";
import type { SelectablePaymentMethod } from "@/types/ledger";
import { paymentMethodLabels } from "@/lib/labels";

export const MAX_DEDUCTIONS = 20;
export const MAX_REASON = 200;
export const MAX_REFERENCE = 100;
export const MAX_NOTES = 1000;
const MAX_MONEY_CENTS = 999_999_999_999;

/** One deduction row. `key` is local (React key and error routing), never sent. */
export interface DeductionRow {
  key: string;
  reason: string;
  amount: number | "";
}

export interface SettlementValues {
  /** "YYYY-MM-DD". */
  settledOn: string;
  deductions: DeductionRow[];
  appliedToBalance: number | "";
  refundAmount: number | "";
  /** "" = not set. Only sent with a refund above $0. */
  refundDate: string;
  refundMethod: SelectablePaymentMethod | "";
  refundReference: string;
  notes: string;
}

/** What the form checks against. */
export interface SettlementContext {
  /** Money string: security + pet deposit. */
  totalHeld: string;
  /** Money string: the most appliedToBalance may be. */
  maxApplicable: string;
  /** settledOn can't be before it: the lease's endedOn, else cancelledOn, else startDate (null = no lower limit). */
  minSettledOn: string | null;
  /** UTC today. */
  today: string;
}

export type SettlementField = "settledOn" | "deductions" | "appliedToBalance" | "refundAmount" | "refundDate" | "refundMethod" | "refundReference" | "notes";
export type SettlementErrors = Partial<Record<SettlementField, string>> & {
  /** By row key. */
  rows?: Record<string, { reason?: string; amount?: string }>;
};

let rowCounter = 0;
/** A fresh, empty deduction row. */
export function newDeduction(reason = "", amount: number | "" = ""): DeductionRow {
  rowCounter += 1;
  return { key: `ded-${rowCounter}`, reason, amount };
}

const moneyValue = (value: string | null | undefined): number | "" => (value === null || value === undefined || value === "" ? "" : centsToAmount(toCents(value)));
const isSelectable = (m: string | null): m is SelectablePaymentMethod => m !== null && Object.hasOwn(paymentMethodLabels, m);

/**
 * The form's starting values: the saved settlement (to edit it), else `suggested`, else (not tracked, no suggestion) the same
 * default as `suggested`: the whole deposit as a refund. settledOn defaults to today.
 */
export function settlementDefaults(deposit: Pick<DepositResponse, "settlement" | "suggested" | "totalHeld">, today: string): SettlementValues {
  const s = deposit.settlement;
  if (s) {
    return {
      settledOn: s.settledOn,
      deductions: s.deductions.map((d) => newDeduction(d.reason, moneyValue(d.amount))),
      appliedToBalance: moneyValue(s.appliedToBalance),
      refundAmount: moneyValue(s.refundAmount),
      refundDate: s.refundDate ?? "",
      refundMethod: isSelectable(s.refundMethod) ? s.refundMethod : "",
      refundReference: s.refundReference ?? "",
      notes: s.notes ?? "",
    };
  }
  const suggested = deposit.suggested;
  return {
    settledOn: today,
    deductions: (suggested?.deductions ?? []).map((d) => newDeduction(d.reason, moneyValue(d.amount))),
    appliedToBalance: moneyValue(suggested?.appliedToBalance ?? "0.00"),
    refundAmount: moneyValue(suggested?.refundAmount ?? deposit.totalHeld),
    refundDate: "",
    refundMethod: "",
    refundReference: "",
    notes: "",
  };
}

const cents = (v: number | "") => (v === "" ? 0 : toCents(v));

/** deductions + applied + refund, in cents. */
export function assignedCents(v: Pick<SettlementValues, "deductions" | "appliedToBalance" | "refundAmount">): number {
  return v.deductions.reduce((sum, d) => sum + cents(d.amount), 0) + cents(v.appliedToBalance) + cents(v.refundAmount);
}

/** totalHeld − (deductions + applied + refund), in cents: 0 = balanced, above 0 = still to assign, below 0 = over. */
export function leftToAssignCents(v: Pick<SettlementValues, "deductions" | "appliedToBalance" | "refundAmount">, totalHeld: string): number {
  return toCents(totalHeld) - assignedCents(v);
}

/** The counter: "$0.00 left to assign" (success), "$X left to assign" (warning) or "Over by $X" (danger). */
export function leftToAssignView(leftCents: number): { text: string; tone: "success" | "warning" | "danger" } {
  if (leftCents === 0) return { text: `${formatCurrency("0.00")} left to assign`, tone: "success" };
  if (leftCents > 0) return { text: `${formatCurrency(centsToAmount(leftCents))} left to assign`, tone: "warning" };
  return { text: `Over by ${formatCurrency(centsToAmount(-leftCents))}`, tone: "danger" };
}

/** The form's checks, like the backend's. The sum rule isn't here: the counter shows it and Save waits for $0.00. */
export function settlementErrors(v: SettlementValues, ctx: SettlementContext): SettlementErrors {
  const errors: SettlementErrors = {};
  if (!v.settledOn) errors.settledOn = "Choose the settlement date.";
  else if (!parseDateOnly(v.settledOn)) errors.settledOn = "Use a full date.";
  else if (v.settledOn > ctx.today) errors.settledOn = "The settlement date can't be after today.";
  else if (ctx.minSettledOn && v.settledOn < ctx.minSettledOn) errors.settledOn = `The settlement date can't be before the lease ended (${formatDate(ctx.minSettledOn)}).`;

  if (v.deductions.length > MAX_DEDUCTIONS) errors.deductions = `At most ${MAX_DEDUCTIONS} deductions.`;
  const rows: NonNullable<SettlementErrors["rows"]> = {};
  for (const d of v.deductions) {
    const row: { reason?: string; amount?: string } = {};
    const reason = d.reason.trim();
    if (!reason) row.reason = "Enter a reason.";
    else if (reason.length > MAX_REASON) row.reason = `At most ${MAX_REASON} characters.`;
    if (d.amount === "" || toCents(d.amount) <= 0) row.amount = "Enter an amount above $0.00.";
    else if (toCents(d.amount) > MAX_MONEY_CENTS) row.amount = "At most $9,999,999,999.99.";
    if (row.reason || row.amount) rows[d.key] = row;
  }
  if (Object.keys(rows).length > 0) errors.rows = rows;

  const applied = cents(v.appliedToBalance);
  if (applied > toCents(ctx.maxApplicable)) errors.appliedToBalance = `At most ${formatCurrency(ctx.maxApplicable)} (what the tenant owes, up to the deposit).`;
  if (cents(v.refundAmount) > MAX_MONEY_CENTS) errors.refundAmount = "At most $9,999,999,999.99.";
  if (cents(v.refundAmount) > 0 && v.refundDate && !parseDateOnly(v.refundDate)) errors.refundDate = "Use a full date.";
  if (v.refundReference.trim().length > MAX_REFERENCE) errors.refundReference = `At most ${MAX_REFERENCE} characters.`;
  if (v.notes.trim().length > MAX_NOTES) errors.notes = `At most ${MAX_NOTES} characters.`;
  return errors;
}

export const hasErrors = (e: SettlementErrors) => Object.keys(e).length > 0;

/** Save is allowed only with no errors and exactly $0.00 left to assign. */
export function canSaveSettlement(v: SettlementValues, ctx: SettlementContext): boolean {
  return leftToAssignCents(v, ctx.totalHeld) === 0 && !hasErrors(settlementErrors(v, ctx));
}

/**
 * The PUT /leases/:id/deposit body (also `deposit` on POST /end). Money as numbers; reasons, reference and notes trimmed.
 * The refund date, method and reference only go with a refund above $0 (the API refuses them otherwise); blank ones are null.
 */
export function settlementBody(v: SettlementValues): DepositBody {
  const refund = cents(v.refundAmount);
  const notes = v.notes.trim();
  const body: DepositBody = {
    settledOn: v.settledOn,
    deductions: v.deductions.map((d) => ({ reason: d.reason.trim(), amount: centsToAmount(cents(d.amount)) })),
    appliedToBalance: centsToAmount(cents(v.appliedToBalance)),
    refundAmount: centsToAmount(refund),
    notes: notes || null,
  };
  if (refund > 0) {
    body.refundDate = v.refundDate || null;
    body.refundMethod = v.refundMethod || null;
    body.refundReference = v.refundReference.trim() || null;
  }
  return body;
}

const FIELD_NAMES: Record<string, string> = {
  settledOn: "Settled on",
  appliedToBalance: "Applied to balance",
  refundAmount: "Refund amount",
  refundDate: "Refund date",
  refundMethod: "Refund method",
  refundReference: "Reference",
  notes: "Notes",
};

/** "deposit.appliedToBalance must not be less than 0" (from POST /end) -> "Applied to balance must not be less than 0". */
function friendly(message: string): string {
  return message.replace(/^deposit\./, "").replace(/^(\w+)/, (w) => FIELD_NAMES[w] ?? w);
}

/**
 * Splits a failed save's messages (400s from PUT /deposit or the `deposit.*` ones from POST /end): field messages go under their
 * field (a deduction's under its row, by index), the rest (the sum rule, "need a refundAmount above 0", 409s) at the top.
 */
export function splitSettlementErrors(messages: string[], rowKeys: string[]): { errors: SettlementErrors; form: string[] } {
  const errors: SettlementErrors = {};
  const form: string[] = [];
  for (const raw of messages) {
    const m = raw.replace(/^deposit\./, "");
    const row = /^deductions\.(\d+)\.(reason|amount)\b/.exec(m);
    if (row && rowKeys[Number(row[1])]) {
      const key = rowKeys[Number(row[1])];
      const part = row[2] as "reason" | "amount";
      const text = m.replace(/^deductions\.\d+\.(reason|amount)/, part === "reason" ? "Reason" : "Amount");
      errors.rows = { ...errors.rows, [key]: { ...errors.rows?.[key], [part]: text } };
      continue;
    }
    // The sum rule and the refund-extras rule start with a field name but are about the whole form.
    if (/^deductions \(/.test(m) || /^refundDate, refundMethod/.test(m)) {
      form.push(friendly(m));
      continue;
    }
    const field = (["settledOn", "appliedToBalance", "refundAmount", "refundDate", "refundMethod", "refundReference", "notes"] as const).find((f) => m.startsWith(`${f} `) || m.startsWith(`${f}(`));
    if (field) {
      errors[field] = [errors[field], friendly(m)].filter(Boolean).join(" ");
      continue;
    }
    if (m.startsWith("deductions")) {
      errors.deductions = [errors.deductions, m.replace(/^deductions/, "Deductions")].filter(Boolean).join(" ");
      continue;
    }
    form.push(raw);
  }
  return { errors, form };
}
