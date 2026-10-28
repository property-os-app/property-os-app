import * as React from "react";
import { Badge, type Tone } from "@/components/atoms/Badge";

/**
 * Domain status map from the guideline, section 7.
 * Keeps color decisions out of feature code: pass the domain and the raw status string.
 * rent, lease, esign, unit, insurance and approval use the backend enums as keys (../property-os-api/docs/frontend-handoff/API.md section 2) and show a friendly label.
 */
export type RentStatus = "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" | "NOT_BILLED";
/** Backend LeaseStatus plus the UI-only "EXPIRING" (an ACTIVE lease with endingSoon = true). */
export type LeaseStatus = "DRAFT" | "ACTIVE" | "EXPIRING" | "ENDED" | "TERMINATED";
export type ESignStatus = "NOT_SENT" | "PENDING" | "SIGNED";
export type TicketStatus = "Open" | "Assigned" | "In Progress" | "Resolved" | "Open past SLA";
export type TicketPriority = "Low" | "Normal" | "Urgent" | "Emergency";
export type UnitStatus = "VACANT" | "OCCUPIED" | "RESERVED" | "UNDER_MAINTENANCE";
/** Vendor insuranceStatus (computed by the backend). */
export type InsuranceStatus = "VALID" | "EXPIRING" | "EXPIRED" | "NONE";
/** Backend ExpenseStatus. */
export type ApprovalStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
/** UI status of a lease template, from isDefault and archivedAt (GET /lease-templates). */
export type TemplateStatus = "DEFAULT" | "ACTIVE" | "ARCHIVED";

export const statusTone = {
  rent: { PAID: "success", PARTIAL: "warning", UNPAID: "warning", OVERDUE: "danger", NOT_BILLED: "neutral" },
  lease: { DRAFT: "neutral", ACTIVE: "success", EXPIRING: "warning", ENDED: "neutral", TERMINATED: "danger" },
  esign: { NOT_SENT: "neutral", PENDING: "warning", SIGNED: "success" },
  ticket: { Open: "neutral", Assigned: "warning", "In Progress": "info", Resolved: "success", "Open past SLA": "danger" },
  priority: { Low: "neutral", Normal: "info", Urgent: "warning", Emergency: "danger" },
  unit: { VACANT: "neutral", OCCUPIED: "success", RESERVED: "info", UNDER_MAINTENANCE: "warning" },
  insurance: { VALID: "success", EXPIRING: "warning", EXPIRED: "danger", NONE: "neutral" },
  approval: { PENDING_APPROVAL: "warning", APPROVED: "success", REJECTED: "danger" },
  template: { DEFAULT: "success", ACTIVE: "neutral", ARCHIVED: "neutral" },
} as const satisfies Record<string, Record<string, Tone>>;

/** Friendly label per enum key. Domains not listed here already use display words as keys. */
export const statusLabel = {
  rent: { PAID: "Paid", PARTIAL: "Partial", UNPAID: "Unpaid", OVERDUE: "Overdue", NOT_BILLED: "Not billed" },
  lease: { DRAFT: "Draft", ACTIVE: "Active", EXPIRING: "Expiring", ENDED: "Ended", TERMINATED: "Terminated" },
  esign: { NOT_SENT: "Not sent", PENDING: "Pending", SIGNED: "Signed" },
  unit: { VACANT: "Vacant", OCCUPIED: "Occupied", RESERVED: "Reserved", UNDER_MAINTENANCE: "Under maintenance" },
  template: { DEFAULT: "Default", ACTIVE: "Active", ARCHIVED: "Archived" },
  insurance: { VALID: "Valid", EXPIRING: "Expiring", EXPIRED: "Expired", NONE: "No insurance" },
  approval: { PENDING_APPROVAL: "Pending approval", APPROVED: "Approved", REJECTED: "Rejected" },
} as const satisfies Partial<{ [D in keyof typeof statusTone]: Record<keyof (typeof statusTone)[D], string> }>;

export type StatusDomain = keyof typeof statusTone;

export type StatusBadgeProps<D extends StatusDomain> = {
  domain: D;
  status: keyof (typeof statusTone)[D];
  className?: string;
  /** Override the visible text, for example "9 days overdue". */
  children?: React.ReactNode;
};

export function StatusBadge<D extends StatusDomain>({ domain, status, className, children }: StatusBadgeProps<D>) {
  const tone = (statusTone[domain] as Record<string, Tone>)[status as string] ?? "neutral";
  const labels = (statusLabel as Partial<Record<StatusDomain, Record<string, string>>>)[domain];
  return (
    <Badge tone={tone} className={className}>
      {children ?? labels?.[status as string] ?? (status as string)}
    </Badge>
  );
}
