import { useMemo, type ReactNode } from "react";
import { CalendarRange, Eye, Plus, Wallet } from "lucide-react";
import { Avatar, Badge, Caption, Dash, Num } from "@/components/atoms";
import { KebabMenu, ListCard, StatusBadge, type MenuItem } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { centsToAmount, formatCurrency, toCents, type MoneyInput } from "@/lib/format";
import { leaseStatusLabels } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { BalanceText } from "@/features/ledger/LedgerParts";
import { balanceText } from "@/features/ledger/balance";
import { paidCaption, rowTotals, statusDate, type UpcomingRow } from "@/features/rent-roll/stats";
import type { RentRollRow } from "@/types/rentRoll";

type Props = Pick<DataTableProps<RentRollRow>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer" | "caption"> & {
  /** Rows the totals row sums (all filtered rows, not only this page). */
  totalRows: RentRollRow[];
  /** false hides the property name under the unit (one property picked in the scope). */
  showProperty: boolean;
  /** A month before the current UTC month: OVERDUE rows say "Unpaid at month end". */
  pastMonth: boolean;
  /** NOT_BILLED rows Generate rent skips, by leaseId: "Upcoming" badge and caption. null while the leases load. */
  upcoming: Map<string, UpcomingRow> | null;
  onOpen: (row: RentRollRow) => void;
  /** Omit to hide the item (role can't do it). */
  onRecordPayment?: (row: RentRollRow) => void;
  onAddCharge?: (row: RentRollRow) => void;
};

/** Previous balance: Dash at 0, plain when owed, "Credit $X" in success color when negative. */
function PreviousBalance({ value }: { value: MoneyInput }) {
  const cents = toCents(value);
  if (cents === 0) return <Dash />;
  return <Num className={cn(cents < 0 && "text-success")}>{balanceText(value)}</Num>;
}

/** "Owed $X" with "Credits $Y" under it (only when there are credits). */
function OwedTotal({ owedCents, creditCents }: { owedCents: number; creditCents: number }) {
  return (
    <WithCaption caption={creditCents > 0 ? `Credits ${formatCurrency(centsToAmount(creditCents))}` : null}>
      <Num className="whitespace-nowrap">Owed {formatCurrency(centsToAmount(owedCents))}</Num>
    </WithCaption>
  );
}

/** Amount with an optional caption under it, right-aligned. */
function WithCaption({ children, caption }: { children: ReactNode; caption: string | null }) {
  if (!caption) return <>{children}</>;
  return (
    <span className="flex flex-col items-end">
      {children}
      <Caption className="whitespace-nowrap font-normal">{caption}</Caption>
    </span>
  );
}

/**
 * The Rent Roll table: tenant, unit (property name under it), previous balance, rent due, paid, balance,
 * status (status date under it), kebab, and the totals row over all filtered rows.
 */
export function RentRollTable({ totalRows, showProperty, pastMonth, upcoming, onOpen, onRecordPayment, onAddCharge, ...props }: Props) {
  const isMobile = useIsMobile();
  const menu = useMemo(
    () => (r: RentRollRow) => {
      const items: MenuItem[] = [{ label: "Open ledger", icon: <Eye strokeWidth={1.5} />, onSelect: () => onOpen(r) }];
      if (onRecordPayment) items.push({ label: "Record payment", icon: <Wallet strokeWidth={1.5} />, onSelect: () => onRecordPayment(r) });
      // Leases starting or ending inside the month: the same Add charge modal, prefilled with prorated rent.
      const partial = upcoming?.get(r.leaseId)?.kind;
      if (onAddCharge && (partial === "starts-late" || partial === "ends-early")) {
        items.push({ label: "Bill partial month", icon: <CalendarRange strokeWidth={1.5} />, onSelect: () => onAddCharge(r) });
      } else if (onAddCharge) {
        items.push({ label: "Add charge", icon: <Plus strokeWidth={1.5} />, onSelect: () => onAddCharge(r) });
      }
      return <KebabMenu label={`Actions for lease ${r.leaseNumber}`} items={items} />;
    },
    [upcoming, onOpen, onRecordPayment, onAddCharge],
  );

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
      {
        key: "unit",
        header: "Unit",
        sortable: true,
        cell: (r) => (
          <span className="flex flex-col">
            {r.unit.unitNumber}
            {showProperty && <Caption>{r.unit.property.name}</Caption>}
          </span>
        ),
      },
      { key: "opening", header: "Previous balance", align: "right", sortable: true, cell: (r) => <PreviousBalance value={r.openingBalance} /> },
      { key: "charged", header: "Rent due", align: "right", cell: (r) => <Num>{formatCurrency(r.charged)}</Num> },
      {
        key: "paid",
        header: "Paid",
        align: "right",
        sortable: true,
        cell: (r) => (
          <WithCaption caption={paidCaption(r)}>
            <Num>{formatCurrency(r.paid)}</Num>
          </WithCaption>
        ),
      },
      { key: "balance", header: "Balance", align: "right", sortable: true, cell: (r) => <BalanceText value={r.balance} /> },
      {
        key: "status",
        header: "Status",
        cell: (r) => {
          const next = upcoming?.get(r.leaseId);
          if (next) {
            return (
              <span className="flex flex-col items-start gap-0.5">
                <Badge tone="info">Upcoming</Badge>
                <Caption className="whitespace-nowrap">{next.caption}</Caption>
              </span>
            );
          }
          const d = statusDate(r, pastMonth);
          return (
            <span className="flex flex-col items-start gap-0.5">
              <StatusBadge domain="rent" status={r.status} />
              {d.text && <Caption className={cn("whitespace-nowrap", d.tone === "danger" && "font-semibold text-danger")}>{d.text}</Caption>}
            </span>
          );
        },
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: 56,
        cell: menu,
      },
    ],
    [showProperty, pastMonth, upcoming, menu],
  );

  const t = rowTotals(totalRows);

  if (isMobile) {
    const credits = t.creditCents > 0 ? `Credits ${formatCurrency(centsToAmount(t.creditCents))}` : undefined;
    return (
      <CardList
        rows={props.rows}
        state={props.state}
        empty={props.empty}
        error={props.error}
        footer={props.footer}
        caption={props.caption ?? "Rent roll"}
        rowKey={(r) => r.leaseId}
        summary={
          <ListCard
            className="bg-surface-2"
            title="Totals"
            subtitle={`${t.billed.toLocaleString("en-US")} billed`}
            amount={{ label: "Owed", value: formatCurrency(centsToAmount(t.owedCents)), caption: credits }}
            facts={[
              { label: "Rent due", value: <Num>{formatCurrency(centsToAmount(t.chargedCents))}</Num> },
              { label: "Paid", value: <Num className="text-success">{formatCurrency(centsToAmount(t.paidCents))}</Num> },
            ]}
          />
        }
        renderCard={(r) => {
          const next = upcoming?.get(r.leaseId);
          const d = statusDate(r, pastMonth);
          const paid = paidCaption(r);
          const name = r.primaryTenant?.fullName;
          return (
            <ListCard
              onOpen={() => onOpen(r)}
              openLabel={`Open ledger for lease ${r.leaseNumber}${name ? `, ${name}` : ""}`}
              leading={<Avatar name={name ?? "-"} size={32} />}
              title={name ?? <span className="text-text-muted">No tenant</span>}
              subtitle={[`Unit ${r.unit.unitNumber}`, showProperty ? r.unit.property.name : null, r.leaseNumber].filter(Boolean).join(" · ")}
              badge={
                <>
                  {next ? <Badge tone="info">Upcoming</Badge> : <StatusBadge domain="rent" status={r.status} />}
                  {r.leaseStatus !== "ACTIVE" && <Badge tone="neutral">{leaseStatusLabels[r.leaseStatus]}</Badge>}
                  {next && <Caption>{next.caption}</Caption>}
                </>
              }
              amount={{
                label: "Balance",
                value: <BalanceText value={r.balance} />,
                caption: !next && d.text ? <span className={cn(d.tone === "danger" && "font-semibold text-danger")}>{d.text}</span> : undefined,
              }}
              // The strip means one thing only: behind on rent.
              strip={r.status === "OVERDUE"}
              facts={[
                { label: "Rent due", value: <Num>{formatCurrency(r.charged)}</Num> },
                {
                  label: "Paid",
                  value: (
                    <span className="flex flex-col">
                      <Num>{formatCurrency(r.paid)}</Num>
                      {paid && <Caption className="truncate">{paid}</Caption>}
                    </span>
                  ),
                },
                ...(toCents(r.openingBalance) !== 0 ? [{ label: "Previous balance", value: <PreviousBalance value={r.openingBalance} /> }] : []),
              ]}
              actions={menu(r)}
            />
          );
        }}
      />
    );
  }

  // One cell per column, by key, so the row stays aligned with the columns.
  const totalCells: Record<string, ReactNode> = {
    tenant: (
      <span className="flex flex-col">
        Totals
        <Caption className="font-normal">{`${t.billed.toLocaleString("en-US")} billed`}</Caption>
      </span>
    ),
    opening: <PreviousBalance value={centsToAmount(t.openingCents)} />,
    charged: <Num>{formatCurrency(centsToAmount(t.chargedCents))}</Num>,
    paid: <Num className="text-success">{formatCurrency(centsToAmount(t.paidCents))}</Num>,
    balance: <OwedTotal owedCents={t.owedCents} creditCents={t.creditCents} />,
  };
  const totals = columns.map((c) => totalCells[c.key] ?? "");

  return <DataTable {...props} columns={columns} rowKey={(r) => r.leaseId} onRowClick={onOpen} totals={totals} />;
}
