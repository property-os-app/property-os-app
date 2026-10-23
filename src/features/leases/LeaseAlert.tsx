import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Caption } from "@/components/atoms";
import { Card } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { daysSince, daysUntil, formatCurrency, formatDate } from "@/lib/format";
import { plural } from "@/lib/labels";
import { OverdueActions } from "@/features/leases/OverdueActions";
import { dueState, isPastEnd, leaseMissing, primaryTenant } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

type AlertTone = "danger" | "warning" | "info";

const alertStyles: Record<AlertTone, { card: string; title: string }> = {
  danger: { card: "border-danger/40 bg-danger-soft", title: "text-danger" },
  warning: { card: "border-warning/40 bg-warning-soft", title: "text-warning" },
  info: { card: "border-info/40 bg-info-soft", title: "text-info" },
};

function AlertCard({ tone, title, text, children }: { tone: AlertTone; title: string; text: string; children?: ReactNode }) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <Card padding="compact" className={cn("flex items-start gap-3", alertStyles[tone].card)}>
      <Icon size={18} strokeWidth={1.5} className={cn("mt-0.5 shrink-0", alertStyles[tone].title)} aria-hidden />
      <div className="min-w-0">
        <div className={cn("font-semibold", alertStyles[tone].title)}>{title}</div>
        <Caption className="text-text-primary">{text}</Caption>
        {children}
      </div>
    </Card>
  );
}

/**
 * The first alert that applies: draft, past end date, overdue rent, expiring soon. Nothing otherwise.
 * Overdue (dueState) adds Call / Email reminder under whichever alert shows (past end date wins over overdue).
 */
export function LeaseAlert({ lease }: { lease: Lease }) {
  const due = dueState(lease);
  const primary = primaryTenant(lease);
  const actions = due.kind === "overdue" && primary ? <OverdueActions lease={lease} primary={primary} since={due.since} /> : undefined;
  if (lease.status === "DRAFT") {
    const missing = leaseMissing(lease);
    return <AlertCard tone="info" title="Draft, not active yet" text={missing.length > 0 ? `Missing to activate: ${missing.join(", ")}.` : "Ready to activate."} />;
  }
  if (isPastEnd(lease)) {
    const days = daysSince(lease.endDate);
    return (
      <AlertCard tone="danger" title={`Ended ${plural(days, "day")} ago but still active`} text="End the lease or change the end date.">
        {actions}
      </AlertCard>
    );
  }
  if (due.kind === "overdue") {
    return (
      <AlertCard tone="danger" title={`Rent overdue since ${formatDate(due.since)}`} text={`Balance ${formatCurrency(lease.balance)}`}>
        {actions}
      </AlertCard>
    );
  }
  if (lease.status === "ACTIVE" && lease.endingSoon) {
    const days = daysUntil(lease.endDate) ?? 0;
    return (
      <AlertCard
        tone="warning"
        title={days <= 0 ? "Expires today" : `Expires in ${plural(days, "day")}`}
        text={`Ends ${formatDate(lease.endDate)}. Auto-renew is ${lease.autoRenew ? "on" : "off"}.`}
      />
    );
  }
  return null;
}
