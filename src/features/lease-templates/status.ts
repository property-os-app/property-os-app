import type { TemplateStatus } from "@/components/molecules";
import type { LeaseTemplateListItem } from "@/types/leaseTemplate";

/** The UI status of a template: Archived wins, then Default, else Active. */
export function templateStatus(t: Pick<LeaseTemplateListItem, "isDefault" | "archivedAt">): TemplateStatus {
  if (t.archivedAt) return "ARCHIVED";
  return t.isDefault ? "DEFAULT" : "ACTIVE";
}

/** "12 months" / "1 month", or null without a default term. */
export function termText(months: number | null): string | null {
  if (months === null) return null;
  return months === 1 ? "1 month" : `${months} months`;
}
