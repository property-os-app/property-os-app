import { useMemo, type ReactNode } from "react";
import { Caption, Dash, Small } from "@/components/atoms";
import { ListCard } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import { expenseTypeLabels } from "@/lib/labels";
import { ExpenseAmount, ExpenseStatusBadges } from "@/features/expenses/ExpenseParts";
import { propertyLine, propertyText } from "@/features/expenses/expenseText";
import type { Expense, ExpenseList } from "@/types/expense";

type Props = Pick<DataTableProps<Expense>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  /** "cards": the list cards in a grid (desktop Cards view); phones always get cards. */
  view: "table" | "cards";
  isMobile: boolean;
  categoryLabel: (key: string) => string;
  /** Totals over every matching row (not just the page). */
  totals?: ExpenseList["totals"];
  /** True while the next page or filter loads (the old rows stay). */
  updating?: boolean;
  onOpen: (e: Expense) => void;
};

/** "+ $1,840.00 pending (3)", or null with nothing pending. */
function pendingText(totals: ExpenseList["totals"]): string | null {
  return totals.pendingCount > 0 ? `+ ${formatCurrency(totals.pendingAmount)} pending (${totals.pendingCount})` : null;
}

/**
 * The expenses list: a DataTable (Date and Amount sort on the server) with a "Total, filtered" row (approved, non-voided,
 * every matching row) and the pending amount beside it; or ListCards (phones, Cards view) with the same totals in a summary
 * card. Voided rows are muted and struck through. A row or card opens the drawer.
 */
export function ExpensesTable({ view, isMobile, categoryLabel, totals, updating, onOpen, ...props }: Props) {
  const columns = useMemo<Column<Expense>[]>(
    () => [
      { key: "date", header: "Date", sortable: true, cell: (e) => <span className={cn("whitespace-nowrap", e.voided && "text-text-muted")}>{formatDate(e.date)}</span> },
      {
        key: "description",
        header: "Description",
        cell: (e) => (
          <div className="min-w-0">
            <div className={cn("max-w-72 truncate font-semibold", e.voided && "text-text-muted line-through")} title={e.description}>
              {e.description}
            </div>
            <Caption className="block">
              {e.expenseNumber} · {expenseTypeLabels[e.type]}
            </Caption>
          </div>
        ),
      },
      {
        key: "property",
        header: "Property",
        cell: (e) => (
          <div className="min-w-0">
            <div className={cn("max-w-48 truncate", !e.property && "text-text-secondary")}>{propertyText(e)}</div>
            {e.unit && <Caption className="block">Unit {e.unit.unitNumber}</Caption>}
          </div>
        ),
      },
      { key: "category", header: "Category", cell: (e) => <span className="block max-w-44 truncate">{categoryLabel(e.category)}</span> },
      { key: "vendor", header: "Vendor", cell: (e) => (e.vendor ? <span className="block max-w-40 truncate">{e.vendor.name}</span> : <Dash />) },
      { key: "amount", header: "Amount", align: "right", sortable: true, cell: (e) => <ExpenseAmount expense={e} className="font-semibold" /> },
      { key: "status", header: "Status", cell: (e) => <ExpenseStatusBadges expense={e} /> },
    ],
    [categoryLabel],
  );

  const pending = totals ? pendingText(totals) : null;
  const totalsRow: ReactNode[] | undefined = totals
    ? ["Total, filtered", "", "", "", "", formatCurrency(totals.approvedAmount), pending ? <Small className="font-normal">{pending}</Small> : ""]
    : undefined;

  if (isMobile || view === "cards") {
    const summary = totals ? (
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Small className="font-semibold text-text-primary">Total, filtered</Small>
        <span className="text-right">
          <span className="font-bold tabular text-text-primary">{formatCurrency(totals.approvedAmount)}</span>
          {pending && <Small className="block">{pending}</Small>}
        </span>
      </div>
    ) : undefined;
    return (
      <CardList
        rows={props.rows}
        state={props.state}
        empty={props.empty}
        error={props.error}
        footer={props.footer}
        summary={props.state === "ideal" ? summary : undefined}
        grid={!isMobile}
        rowKey={(e) => e.id}
        caption="Expenses"
        className={cn(updating && "opacity-70")}
        renderCard={(e) => (
          <ListCard
            onOpen={() => onOpen(e)}
            openLabel={`Open ${e.expenseNumber}`}
            title={e.description}
            subtitle={`${formatDate(e.date)} · ${propertyLine(e)}`}
            badge={<ExpenseStatusBadges expense={e} />}
            amount={{ label: "Amount", value: <ExpenseAmount expense={e} /> }}
            muted={e.voided}
            facts={[
              { label: "Category", value: categoryLabel(e.category) },
              { label: "Vendor", value: e.vendor?.name ?? <Dash /> },
            ]}
          />
        )}
      />
    );
  }

  return (
    <div aria-busy={updating || undefined} className={cn("transition-opacity", updating && "opacity-70")}>
      <DataTable {...props} columns={columns} rowKey={(e) => e.id} onRowClick={onOpen} totals={totalsRow} caption="Expenses" />
    </div>
  );
}

