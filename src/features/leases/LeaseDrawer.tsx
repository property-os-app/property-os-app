import { useState, type ReactNode } from "react";
import { AlertTriangle, FileX, Info, Wallet } from "lucide-react";
import { Avatar, Button, Caption, Dash, H3, Num, Select, Skeleton, Tag } from "@/components/atoms";
import { Card, EmptyState, InlineError, KeyValueList, StatusBadge, Tabs, toast } from "@/components/molecules";
import { Drawer } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { currentMonthUTC, daysUntil, formatCurrency, formatDate, ordinal, toCents } from "@/lib/format";
import { labelOptions, paymentFrequencyLabels, plural, signatureStatusLabels } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useActivateAction, useLease, useUpdateLease, type ActivateError } from "@/features/leases/hooks";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { LeaseDeleteDialog } from "@/features/leases/LeaseDeleteDialog";
import { LeaseEndModal } from "@/features/leases/LeaseEndModal";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { coTenants, dueNote, dueState, isClosed, isPastEnd, leaseMissing, primaryTenant } from "@/features/leases/stats";
import { TagEditor } from "@/features/leases/TagEditor";
import { AddChargeModal } from "@/features/ledger/AddChargeModal";
import { useLedger } from "@/features/ledger/hooks";
import { LedgerView } from "@/features/ledger/LedgerView";
import { RecordPaymentModal } from "@/features/ledger/RecordPaymentModal";
import type { Lease, SignatureStatus } from "@/types/lease";

type Tab = "details" | "payments" | "tenants";

export interface LeaseDrawerProps {
  leaseId: string;
  /** The list row, shown while GET /leases/:id loads. */
  placeholder?: Lease;
  /** A failed activation from the table (kebab), shown at the top of Details. */
  initialActivateError?: ActivateError | null;
  onClose: () => void;
}

/**
 * One lease (lg drawer): Details (alert card, key values, e-signature, tags), Payments and Tenants tabs.
 * Payments tab: the shared ledger with Add charge / Record Payment.
 * Footer by status: DRAFT Delete draft / Edit / Activate; ACTIVE End lease / Edit; ENDED, TERMINATED Edit notes and tags.
 * Mount it only while open; it closes itself after a delete.
 */
export function LeaseDrawer({ leaseId, placeholder, initialActivateError = null, onClose }: LeaseDrawerProps) {
  const { me } = useAuth();
  const canEdit = can(me!.role, "lease.edit");
  const query = useLease(leaseId, placeholder);
  const lease = query.data;
  const activate = useActivateAction();

  const [tab, setTab] = useState<Tab>("details");
  const [editing, setEditing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activateError, setActivateError] = useState<ActivateError | null>(initialActivateError);

  const notFound = query.error instanceof ApiError && query.error.status === 404;

  const onActivate = async () => {
    if (!lease) return;
    setActivateError(null);
    const error = await activate.run(lease.id);
    if (error) {
      setActivateError(error);
      setTab("details");
    }
  };

  const title = lease ? `Lease, Unit ${lease.unit.unitNumber}, ${lease.unit.property.name}` : "Lease";

  return (
    <>
      <Drawer
        open
        onOpenChange={(open) => !open && onClose()}
        size="lg"
        title={title}
        description={lease ? drawerDescription(lease) : undefined}
        status={lease ? <LeaseBadge lease={lease} /> : undefined}
        tabs={
          lease ? (
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "details", label: "Details" },
                { value: "payments", label: "Payments" },
                { value: "tenants", label: "Tenants", count: lease.tenants.length },
              ]}
            />
          ) : undefined
        }
        footer={lease && canEdit ? <Footer lease={lease} activating={activate.isPending} onActivate={() => void onActivate()} onEdit={() => setEditing(true)} onEnd={() => setEnding(true)} onDelete={() => setDeleting(true)} /> : undefined}
      >
        {!lease ? (
          notFound ? (
            <Card padding="none">
              <EmptyState icon={<FileX strokeWidth={1.5} />} title="Lease not found" description="This lease was deleted or you can't see it." />
            </Card>
          ) : query.isError ? (
            <InlineError title="Couldn't load the lease" description={errorText(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16" />
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-5" />
              ))}
            </div>
          )
        ) : tab === "details" ? (
          <>
            {activateError && (
              <div className="flex flex-col gap-2">
                <InlineError title={activateError.title} description={activateError.description} />
                {activateError.fixable && canEdit && (
                  <Button className="self-start" onClick={() => setEditing(true)}>
                    Edit lease
                  </Button>
                )}
              </div>
            )}
            <LeaseAlert lease={lease} />
            <Details lease={lease} canEdit={canEdit} />
          </>
        ) : tab === "payments" ? (
          <PaymentsTab lease={lease} />
        ) : (
          <TenantsTab lease={lease} />
        )}
      </Drawer>

      {editing && lease && (
        <LeaseWizard
          lease={lease}
          onSaved={() => setActivateError(null)}
          onClose={() => setEditing(false)}
        />
      )}
      {ending && lease && <LeaseEndModal lease={lease} onClose={() => setEnding(false)} />}
      <LeaseDeleteDialog lease={deleting && lease ? lease : null} onClose={() => setDeleting(false)} onDeleted={onClose} />
    </>
  );
}

/** "{primary} · 12-month term · Nov 1, 2026 to Oct 31, 2027", or "{primary or 'No tenant yet'} · Draft" when parts are missing. */
function drawerDescription(lease: Lease): string {
  const name = primaryTenant(lease)?.fullName ?? "No tenant yet";
  if (lease.startDate && lease.endDate && lease.termMonths !== null) {
    return `${name} · ${lease.termMonths}-month term · ${formatDate(lease.startDate)} to ${formatDate(lease.endDate)}`;
  }
  return `${name} · ${lease.status === "DRAFT" ? "Draft" : formatDate(lease.endDate)}`;
}

function Footer({
  lease,
  activating,
  onActivate,
  onEdit,
  onEnd,
  onDelete,
}: {
  lease: Lease;
  activating: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onEnd: () => void;
  onDelete: () => void;
}) {
  if (lease.status === "DRAFT") {
    return (
      <>
        <Button variant="ghost" disabled={activating} onClick={onDelete}>
          Delete draft
        </Button>
        <Button disabled={activating} onClick={onEdit}>
          Edit
        </Button>
        <Button variant="primary" disabled={activating} aria-busy={activating || undefined} onClick={onActivate}>
          {activating ? "Activating..." : "Activate"}
        </Button>
      </>
    );
  }
  if (lease.status === "ACTIVE") {
    return (
      <>
        <Button onClick={onEnd}>End lease</Button>
        <Button variant="primary" onClick={onEdit}>
          Edit
        </Button>
      </>
    );
  }
  return (
    <Button variant="primary" onClick={onEdit}>
      Edit notes and tags
    </Button>
  );
}

/* ---------- Alert card ---------- */

type AlertTone = "danger" | "warning" | "info";

const alertStyles: Record<AlertTone, { card: string; title: string }> = {
  danger: { card: "border-danger/40 bg-danger-soft", title: "text-danger" },
  warning: { card: "border-warning/40 bg-warning-soft", title: "text-warning" },
  info: { card: "border-info/40 bg-info-soft", title: "text-info" },
};

function AlertCard({ tone, title, text }: { tone: AlertTone; title: string; text: string }) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <Card padding="compact" className={cn("flex items-start gap-3", alertStyles[tone].card)}>
      <Icon size={18} strokeWidth={1.5} className={cn("mt-0.5 shrink-0", alertStyles[tone].title)} aria-hidden />
      <div className="min-w-0">
        <div className={cn("font-semibold", alertStyles[tone].title)}>{title}</div>
        <Caption className="text-text-primary">{text}</Caption>
      </div>
    </Card>
  );
}

/** The first alert that applies: draft, past end date, overdue rent, expiring soon. Nothing otherwise. */
function LeaseAlert({ lease }: { lease: Lease }) {
  if (lease.status === "DRAFT") {
    const missing = leaseMissing(lease);
    return <AlertCard tone="info" title="Draft, not active yet" text={missing.length > 0 ? `Missing to activate: ${missing.join(", ")}.` : "Ready to activate."} />;
  }
  if (isPastEnd(lease)) {
    const days = Math.max(1, -(daysUntil(lease.endDate) ?? 1));
    return <AlertCard tone="danger" title={`Ended ${plural(days, "day")} ago but still active`} text="End the lease or change the end date." />;
  }
  const due = dueState(lease);
  if (due.kind === "overdue") {
    return <AlertCard tone="danger" title={`Rent overdue since ${formatDate(due.since)}`} text={`Balance ${formatCurrency(lease.balance)}`} />;
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

/* ---------- Details tab ---------- */

const orDash = (value: ReactNode) => (value === null || value === undefined || value === "" ? <Dash /> : value);

function Details({ lease, canEdit }: { lease: Lease; canEdit: boolean }) {
  const primary = primaryTenant(lease);
  const co = coTenants(lease);
  const due = dueState(lease);
  const closed = isClosed(lease);
  const lateFeeCents = toCents(lease.lateFeeAmount);
  const balanceCents = toCents(lease.balance);

  const rent = lease.rent === null ? null : (
    <Num>
      {formatCurrency(lease.rent)}
      {lease.rentDueDay !== null ? `, due on the ${ordinal(lease.rentDueDay)}` : ""}
    </Num>
  );

  return (
    <>
      <KeyValueList
        labelWidth={150}
        items={[
          {
            label: "Tenant",
            value: primary ? (
              <span className="inline-flex items-center gap-2">
                <Avatar name={primary.fullName} size={24} />
                {primary.fullName}
              </span>
            ) : (
              <Dash />
            ),
          },
          { label: "Co-tenants", value: orDash(co.map((t) => t.fullName).join(", ")) },
          { label: "Term", value: lease.startDate || lease.endDate ? `${formatDate(lease.startDate)} to ${formatDate(lease.endDate)}` : <Dash /> },
          { label: "Monthly rent", value: orDash(rent) },
          { label: "Security deposit", value: lease.deposit === null ? <Dash /> : <Num>{formatCurrency(lease.deposit)}</Num> },
          { label: "Payment frequency", value: paymentFrequencyLabels[lease.paymentFrequency] },
          { label: "Auto-renew", value: lease.autoRenew ? "On" : "Off" },
          {
            label: "Late fee",
            value: lateFeeCents === 0 ? "None" : <Num>{`${formatCurrency(lease.lateFeeAmount)} after a ${lease.lateFeeGraceDays}-day grace period`}</Num>,
          },
          { label: "Lease number", value: lease.leaseNumber },
          {
            label: "Balance",
            value: (
              <span className="flex flex-col">
                <Num className={cn(balanceCents > 0 && due.kind === "overdue" && "font-semibold text-danger")}>{formatCurrency(lease.balance)}</Num>
                <Caption>{dueNote(due)}</Caption>
              </span>
            ),
          },
          { label: "Notes", value: lease.notes ? <span className="whitespace-pre-line">{lease.notes}</span> : <Dash /> },
        ]}
      />

      <SignatureSection lease={lease} canChange={canEdit && !closed} />
      <TagsSection lease={lease} canEdit={canEdit} />
    </>
  );
}

/** E-signature badge, plus a small Select (PATCH signatureStatus only) for users who can edit. */
function SignatureSection({ lease, canChange }: { lease: Lease; canChange: boolean }) {
  const update = useUpdateLease();
  const [error, setError] = useState<string | null>(null);

  const change = async (signatureStatus: SignatureStatus) => {
    setError(null);
    try {
      await update.mutateAsync({ id: lease.id, body: { signatureStatus } });
      toast.success("Signature status updated");
    } catch (err) {
      setError(errorText(err));
    }
  };

  const shown = update.isPending ? (update.variables?.body.signatureStatus ?? lease.signatureStatus) : lease.signatureStatus;

  return (
    <div className="flex flex-col gap-3">
      <H3>E-signature</H3>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge domain="esign" status={shown} />
        {canChange && (
          <div className="w-44">
            <Select aria-label="Change e-signature status" value={shown} disabled={update.isPending} onChange={(e) => void change(e.target.value as SignatureStatus)}>
              {labelOptions(signatureStatusLabels).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {error && <InlineError title="Couldn't update the signature status" description={error} />}
    </div>
  );
}

/** Tag chips; with edit rights, remove (x) and "+ Add tag" save the whole list with PATCH tags (any status). */
function TagsSection({ lease, canEdit }: { lease: Lease; canEdit: boolean }) {
  const update = useUpdateLease();
  const [error, setError] = useState<string | null>(null);
  const tags = update.isPending ? (update.variables?.body.tags ?? lease.tags) : lease.tags;

  const save = async (next: string[]) => {
    setError(null);
    try {
      await update.mutateAsync({ id: lease.id, body: { tags: next } });
      toast.success("Tags updated");
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <H3>Tags</H3>
      {canEdit ? (
        <TagEditor idPrefix="ld-tags" value={tags} onChange={(next) => void save(next)} disabled={update.isPending} />
      ) : tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      ) : (
        <Dash />
      )}
      {error && <InlineError title="Couldn't save the tags" description={error} />}
    </div>
  );
}

/* ---------- Payments tab ---------- */

/** The shared ledger plus Add charge / Record Payment (by permission). DRAFT leases can't have charges or payments. */
function PaymentsTab({ lease }: { lease: Lease }) {
  const { me } = useAuth();
  const role = me!.role;
  const canCharge = can(role, "charge.create");
  const canPay = can(role, "payment.create");
  // Same query as LedgerView (shared cache): the payment modal needs the summary balance.
  const ledger = useLedger(lease.id);
  const [charging, setCharging] = useState(false);
  const [paying, setPaying] = useState(false);

  if (lease.status === "DRAFT") {
    return (
      <Card padding="none">
        <EmptyState icon={<Wallet strokeWidth={1.5} />} title="No payments on a draft" description="Activate the lease to add charges and payments." />
      </Card>
    );
  }

  const balance = ledger.data?.summary.balance;
  const tenantName = primaryTenant(lease)?.fullName ?? "No tenant";

  return (
    <>
      {(canCharge || canPay) && (
        <div className="flex flex-wrap justify-end gap-3">
          {canCharge && <Button onClick={() => setCharging(true)}>Add charge</Button>}
          {canPay && (
            <Button disabled={balance === undefined} onClick={() => setPaying(true)}>
              Record Payment
            </Button>
          )}
        </div>
      )}
      <LedgerView leaseId={lease.id} canVoid={can(role, "entry.void")} />

      {charging && <AddChargeModal leaseId={lease.id} month={currentMonthUTC()} onClose={() => setCharging(false)} />}
      {paying && balance !== undefined && (
        <RecordPaymentModal
          targets={[{ leaseId: lease.id, label: `${tenantName}, Unit ${lease.unit.unitNumber}, ${lease.unit.property.name}`, unitNumber: lease.unit.unitNumber, balance }]}
          presetLeaseId={lease.id}
          onClose={() => setPaying(false)}
        />
      )}
    </>
  );
}

/* ---------- Tenants tab ---------- */

function TenantsTab({ lease }: { lease: Lease }) {
  if (lease.tenants.length === 0) {
    return (
      <Card padding="none">
        <EmptyState icon={<FileX strokeWidth={1.5} />} title="No tenants yet" description="Add a primary tenant with Edit." />
      </Card>
    );
  }
  return (
    <Card padding="none" className="overflow-hidden">
      <ul className="m-0 list-none divide-y divide-border-subtle p-0">
        {lease.tenants.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={t.fullName} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-text-primary">{t.fullName}</div>
              <Caption className="block truncate">{t.email}</Caption>
            </div>
            <Caption>{t.isPrimary ? "Primary" : "Co-tenant"}</Caption>
          </li>
        ))}
      </ul>
    </Card>
  );
}
