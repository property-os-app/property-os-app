import { useMemo } from "react";
import { Eye, Plus, Wallet } from "lucide-react";
import { Avatar, Badge, Caption, Dash, Num } from "@/components/atoms";
import { KebabMenu, StatusBadge, type MenuItem } from "@/components/molecules";
import { DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { centsToAmount, formatCurrency } from "@/lib/format";
import { leaseStatusLabels } from "@/lib/labels";
import { BalanceText } from "@/features/ledger/LedgerParts";
import { rowTotals, statusDate } from "@/features/rent-roll/stats";
import type { RentRollRow } from "@/types/rentRoll";

type Props = Pick<DataTableProps<RentRollRow>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer" | "caption"> & {
  /** Rows the totals row sums (all filtered rows, not only this page). */
  totalRows: RentRollRow[];
  onOpen: (row: RentRollRow) => void;
  /** Omit to hide the item (role can't do it). */
  onRecordPayment?: (row: RentRollRow) => void;
  onAddCharge?: (row: RentRollRow) => void;
};

/** The Rent Roll table: tenant, unit, property, rent, paid, balance, status, status date, kebab, and the totals row. */
export function RentRollTable({ totalRows, onOpen, onRecordPayment, onAddCharge, ...props }: Props) {
  const columns = useMemo<Column<RentRollRow>[]>(
    () => [
      {
        key: "tenant",
        header: "Tenant",
        sortable: true,
        cell: (r) => (
          <span className="flex min-w-0 items-center gap-3">
            <Avatar name={r.primaryTenant?.fullName ?? "-"} size={24} />
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2">
                <span className={cn("truncate font-semibold", !r.primaryTenant && "text-text-muted")}>{r.primaryTenant?.fullName ?? "No tenant"}</span>
                {r.leaseStatus !== "ACTIVE" && <Badge tone="neutral">{leaseStatusLabels[r.leaseStatus]}</Badge>}
              </span>
              <Caption>{r.leaseNumber}</Caption>
            </span>
          </span>
        ),
      },
      { key: "unit", header: "Unit", sortable: true, cell: (r) => r.unit.unitNumber },
      { key: "property", header: "Property", cell: (r) => <span className="text-text-secondary">{r.unit.property.name}</span> },
      { key: "rent", header: "Rent", align: "right", cell: (r) => (r.rent === null ? <Dash /> : <Num>{formatCurrency(r.rent)}</Num>) },
      { key: "paid", header: "Paid", align: "right", sortable: true, cell: (r) => <Num>{formatCurrency(r.paid)}</Num> },
      { key: "balance", header: "Balance", align: "right", sortable: true, cell: (r) => <BalanceText value={r.balance} /> },
      { key: "status", header: "Status", cell: (r) => <StatusBadge domain="rent" status={r.status} /> },
      {
        key: "statusDate",
        header: "Status date",
        cell: (r) => {
          const d = statusDate(r);
          if (!d.text) return <Dash />;
          return <span className={cn("text-text-secondary", d.tone === "danger" && "font-semibold text-danger", d.tone === "muted" && "text-text-muted")}>{d.text}</span>;
        },
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: 56,
        cell: (r) => {
          const items: MenuItem[] = [{ label: "Open ledger", icon: <Eye strokeWidth={1.5} />, onSelect: () => onOpen(r) }];
          if (onRecordPayment) items.push({ label: "Record payment", icon: <Wallet strokeWidth={1.5} />, onSelect: () => onRecordPayment(r) });
          if (onAddCharge) items.push({ label: "Add charge", icon: <Plus strokeWidth={1.5} />, onSelect: () => onAddCharge(r) });
          return <KebabMenu label={`Actions for lease ${r.leaseNumber}`} items={items} />;
        },
      },
    ],
    [onOpen, onRecordPayment, onAddCharge],
  );

  const t = rowTotals(totalRows);
  const totals = [
    "Totals",
    `${t.billed.toLocaleString("en-US")} billed`,
    "",
    <Num key="rent">{formatCurrency(centsToAmount(t.rentCents))}</Num>,
    <Num key="paid" className="text-success">{formatCurrency(centsToAmount(t.paidCents))}</Num>,
    <BalanceText key="balance" value={centsToAmount(t.balanceCents)} />,
    "",
    "",
    "",
  ];

  return <DataTable {...props} columns={columns} rowKey={(r) => r.leaseId} onRowClick={onOpen} totals={totals} />;
}
