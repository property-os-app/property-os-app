/** Display texts for an expense. */
import type { Expense } from "@/types/expense";

/** An expense with no property: for the whole portfolio (Owner only). The sidebar's "All properties" means no filter. */
export const PORTFOLIO_WIDE = "Portfolio-wide";

/** The property name, or "Portfolio-wide". */
export function propertyText(e: Pick<Expense, "property">): string {
  return e.property?.name ?? PORTFOLIO_WIDE;
}

/** "Maple Court · Unit 4B", "Maple Court" or "Portfolio-wide". */
export function propertyLine(e: Pick<Expense, "property" | "unit">): string {
  return e.unit ? `${propertyText(e)} · Unit ${e.unit.unitNumber}` : propertyText(e);
}

/** The Owner's own expenses are approved on creation (approvedBy = createdBy); nobody can approve their own otherwise. */
export function isAutoApproved(e: Pick<Expense, "status" | "approvedById" | "createdById">): boolean {
  return e.status === "APPROVED" && e.approvedById !== null && e.approvedById === e.createdById;
}
