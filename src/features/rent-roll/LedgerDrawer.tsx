import { useState } from "react";
import { useNavigate } from "react-router";
import { Avatar, Button, Dash, Num, Skeleton } from "@/components/atoms";
import { InlineError, KeyValueList, StatusBadge, Tabs } from "@/components/molecules";
import { Drawer } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency, formatDate, ordinal, toCents } from "@/lib/format";
import { useLease } from "@/features/leases/hooks";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { LedgerView } from "@/features/ledger/LedgerView";
import type { Lease } from "@/types/lease";
import type { RentRollRow } from "@/types/rentRoll";

type Tab = "ledger" | "lease";

export interface LedgerDrawerProps {
  row: RentRollRow;
  canVoid: boolean;
  /** Omit to hide the footer button (role can't do it). */
  onAddCharge?: () => void;
  onRecordPayment?: () => void;
  onClose: () => void;
}

/** The design's payment ledger drawer (lg): tenant header, the month's rent status, Ledger and Lease tabs, Add charge / Record Payment. */
export function LedgerDrawer({ row, canVoid, onAddCharge, onRecordPayment, onClose }: LedgerDrawerProps) {
  const lease = useLease(row.leaseId);
  const [tab, setTab] = useState<Tab>("ledger");
  const name = row.primaryTenant?.fullName ?? "No tenant";
  const endDate = lease.data?.endDate;

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={row.primaryTenant?.fullName ?? "-"} size={40} />
          <span className="truncate">{name}</span>
        </span>
      }
      description={`Unit ${row.unit.unitNumber}, ${row.unit.property.name}${endDate ? ` · Lease to ${formatDate(endDate)}` : ""}`}
      status={<StatusBadge domain="rent" status={row.status} />}
      tabs={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "ledger", label: "Ledger" },
            { value: "lease", label: "Lease" },
          ]}
        />
      }
      footer={
        onAddCharge || onRecordPayment ? (
          <>
            {onAddCharge && <Button onClick={onAddCharge}>Add charge</Button>}
            {onRecordPayment && (
              <Button variant="primary" onClick={onRecordPayment}>
                Record Payment
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {tab === "ledger" ? (
        <LedgerView leaseId={row.leaseId} canVoid={canVoid} />
      ) : lease.data ? (
        <LeaseTab lease={lease.data} />
      ) : lease.isError ? (
        <InlineError title="Couldn't load the lease" description={errorText(lease.error)} onRetry={() => void lease.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      )}
    </Drawer>
  );
}

function LeaseTab({ lease }: { lease: Lease }) {
  const navigate = useNavigate();
  return (
    <>
      <KeyValueList
        labelWidth={150}
        items={[
          { label: "Lease number", value: lease.leaseNumber },
          { label: "Status", value: <LeaseBadge lease={lease} /> },
          { label: "Term", value: lease.startDate || lease.endDate ? `${formatDate(lease.startDate)} to ${formatDate(lease.endDate)}` : <Dash /> },
          {
            label: "Rent",
            value:
              lease.rent === null ? (
                <Dash />
              ) : (
                <Num>
                  {formatCurrency(lease.rent)}
                  {lease.rentDueDay !== null ? `, due on the ${ordinal(lease.rentDueDay)}` : ""}
                </Num>
              ),
          },
          { label: "Security deposit", value: lease.deposit === null ? <Dash /> : <Num>{formatCurrency(lease.deposit)}</Num> },
          {
            label: "Late fee",
            value: toCents(lease.lateFeeAmount) === 0 ? "None" : <Num>{`${formatCurrency(lease.lateFeeAmount)} after a ${lease.lateFeeGraceDays}-day grace period`}</Num>,
          },
          { label: "Notes", value: lease.notes ? <span className="whitespace-pre-line">{lease.notes}</span> : <Dash /> },
        ]}
      />
      <Button variant="ghost" className="self-start" onClick={() => void navigate("/leases")}>
        Open in Leases
      </Button>
    </>
  );
}
