import { useState, type ReactNode } from "react";
import { FileX } from "lucide-react";
import { Avatar, Caption, Dash, H3, Num, Select, Tag } from "@/components/atoms";
import { Card, CardHeader, EmptyState, InlineError, KeyValueList, StatusBadge, toast } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, ordinal, toCents } from "@/lib/format";
import { labelOptions, paymentFrequencyLabels, signatureStatusLabels } from "@/lib/labels";
import { leaseErrorText, useUpdateLease } from "@/features/leases/hooks";
import { coTenants, dueNote, dueState, isClosed, primaryTenant } from "@/features/leases/stats";
import { TagEditor } from "@/features/leases/TagEditor";
import type { Lease, SignatureStatus } from "@/types/lease";

/** Tabs of the lease page (moved from the old lease drawer): Details and Tenants. The Ledger tab is LedgerView. */

const orDash = (value: ReactNode) => (value === null || value === undefined || value === "" ? <Dash /> : value);

/** Details tab: the key values (with Notes) in a card, E-signature and Tags cards on the right. */
export function DetailsTab({ lease, canEdit }: { lease: Lease; canEdit: boolean }) {
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="self-start lg:col-span-8">
        <CardHeader title="Details" />
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
      </Card>
      <div className="flex flex-col gap-6 lg:col-span-4">
        <Card>
          <SignatureSection lease={lease} canChange={canEdit && !closed} />
        </Card>
        <Card>
          <TagsSection lease={lease} canEdit={canEdit} />
        </Card>
      </div>
    </div>
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
      setError(leaseErrorText(err));
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
      setError(leaseErrorText(err));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <H3>Tags</H3>
      {canEdit ? (
        <TagEditor idPrefix="lp-tags" value={tags} onChange={(next) => void save(next)} disabled={update.isPending} />
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

export function TenantsTab({ lease }: { lease: Lease }) {
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
