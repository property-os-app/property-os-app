import * as React from "react";
import { Badge, type Tone } from "@/components/atoms/Badge";

/**
 * Domain status map from the guideline, section 7.
 * Keeps color decisions out of feature code: pass the domain and the raw status string.
 */
export type RentStatus = "Paid" | "Partial" | "Late" | "Overdue" | "Vacant";
export type LeaseStatus = "Active" | "Expiring" | "Month-to-Month" | "Expired" | "Draft";
export type ESignStatus = "Signed" | "Pending" | "Declined" | "Not sent";
export type TicketStatus = "Open" | "Assigned" | "In Progress" | "Resolved" | "Open past SLA";
export type TicketPriority = "Low" | "Normal" | "Urgent" | "Emergency";
export type UnitStatus = "Occupied" | "Vacant" | "Under Renovation";
export type InsuranceStatus = "Valid" | "Expiring" | "Expired";
export type ApprovalStatus = "Approved" | "Pending" | "Rejected";

export const statusTone = {
  rent: { Paid: "success", Partial: "warning", Late: "warning", Overdue: "danger", Vacant: "neutral" },
  lease: { Active: "success", Expiring: "warning", "Month-to-Month": "warning", Expired: "danger", Draft: "neutral" },
  esign: { Signed: "success", Pending: "warning", Declined: "danger", "Not sent": "neutral" },
  ticket: { Open: "neutral", Assigned: "warning", "In Progress": "info", Resolved: "success", "Open past SLA": "danger" },
  priority: { Low: "neutral", Normal: "info", Urgent: "warning", Emergency: "danger" },
  unit: { Occupied: "success", Vacant: "neutral", "Under Renovation": "warning" },
  insurance: { Valid: "success", Expiring: "warning", Expired: "danger" },
  approval: { Approved: "success", Pending: "warning", Rejected: "danger" },
} as const satisfies Record<string, Record<string, Tone>>;

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
  return (
    <Badge tone={tone} className={className}>
      {children ?? (status as string)}
    </Badge>
  );
}
