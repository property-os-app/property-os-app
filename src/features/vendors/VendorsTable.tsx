import { useMemo } from "react";
import { Avatar, Caption, Dash, Num } from "@/components/atoms";
import { ListCard } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { formatCurrency } from "@/lib/format";
import { plural, rateUnitLabels } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { ContactLink } from "@/features/shared/ContactLink";
import { MergedSortHeader } from "@/features/shared/MergedSortHeader";
import { RatingText } from "@/features/shared/Rating";
import { InactiveBadge, InsuranceBadge, VendorMenu, type VendorActions } from "@/features/vendors/VendorParts";
import { rateText, tradeLine } from "@/features/vendors/vendorText";
import type { Vendor } from "@/types/vendor";

type Props = Pick<DataTableProps<Vendor>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  tradeLabel: (key: string) => string;
  onOpen: (v: Vendor) => void;
  actions?: VendorActions;
};

/**
 * The Table view of the vendor directory (from md up): Vendor, Expenses, Rating and Jobs sort; on phones the same rows as cards
 * (the Cards view on phones too). Row or card opens the drawer; the kebab and contact links don't.
 */
export function VendorsTable({ tradeLabel, onOpen, actions, ...props }: Props) {
  const isMobile = useIsMobile();

  const columns = useMemo<Column<Vendor>[]>(() => {
    const cols: Column<Vendor>[] = [
      {
        key: "vendor",
        header: "Vendor",
        sortable: true,
        cell: (v) => (
          // py-2: room for the phone copy button's 44px tap area, so the last row doesn't overflow the table box.
          <div className="flex min-w-0 items-center gap-2.5 py-2">
            <Avatar name={v.name} size={24} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{v.name}</span>
                <InactiveBadge vendor={v} />
              </div>
              {(v.contactName || v.phone) && (
                <Caption className="flex max-w-48 min-w-0 items-center gap-1.5">
                  {v.contactName && (
                    <span className="truncate" title={v.contactName}>
                      {v.contactName}
                    </span>
                  )}
                  {v.contactName && v.phone && <span aria-hidden>·</span>}
                  {v.phone && <ContactLink kind="phone" value={v.phone} className="shrink-0" />}
                </Caption>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "trade",
        header: "Trade",
        cell: (v) => (
          <div className="min-w-0">
            <div>{tradeLabel(v.trade)}</div>
            {v.serviceArea && (
              <Caption className="block max-w-40 truncate" title={v.serviceArea}>
                {v.serviceArea}
              </Caption>
            )}
          </div>
        ),
      },
      {
        key: "rate",
        header: "Rate",
        // "$110.00" with "per hour" under it, so the column stays narrow.
        cell: (v) =>
          v.rateAmount !== null && v.rateUnit !== null ? (
            <div>
              <Num>{formatCurrency(v.rateAmount)}</Num>
              <Caption className="block">per {rateUnitLabels[v.rateUnit]}</Caption>
            </div>
          ) : (
            <Dash />
          ),
      },
      { key: "insurance", header: "Insurance", cell: (v) => <InsuranceBadge vendor={v} /> },
      // Rating, jobs and active tickets in one column; the header keeps both sorts (Rating, Jobs).
      {
        key: "jobs",
        header: <MergedSortHeader sort={props.sort} onSortChange={props.onSortChange} keys={[["rating", "Rating"], ["jobs", "Jobs"]]} />,
        cell: (v) => (
          <div>
            <RatingText rating={v.rating} count={v.ratingCount} compact />
            <Caption className="block tabular">
              {plural(v.jobsCount, "job")} · {v.activeTickets} active
            </Caption>
          </div>
        ),
      },
      // Only from 1440px; the drawer's Expenses tab shows the count too.
      { key: "expenses", header: "Expenses", align: "right", sortable: true, wideOnly: true, cell: (v) => <Num>{v.expenseCount}</Num> },
    ];
    if (actions) cols.push({ key: "actions", header: <span className="sr-only">Actions</span>, width: 56, cell: (v) => <VendorMenu vendor={v} actions={actions} /> });
    return cols;
  }, [tradeLabel, actions, props.sort, props.onSortChange]);

  if (isMobile) {
    return (
      <CardList
        rows={props.rows}
        state={props.state}
        empty={props.empty}
        error={props.error}
        footer={props.footer}
        rowKey={(v) => v.id}
        caption="Vendors"
        renderCard={(v) => (
          <ListCard
            onOpen={() => onOpen(v)}
            openLabel={`Open ${v.name}`}
            leading={<Avatar name={v.name} size={32} />}
            title={v.name}
            subtitle={tradeLine(tradeLabel(v.trade), v)}
            badge={
              <>
                <InsuranceBadge vendor={v} />
                <InactiveBadge vendor={v} />
              </>
            }
            muted={v.archivedAt !== null}
            facts={[
              { label: "Rate", value: rateText(v) ?? <Dash /> },
              { label: "Phone", value: <ContactLink kind="phone" value={v.phone} /> },
              { label: "Rating", value: <RatingText rating={v.rating} count={v.ratingCount} compact /> },
            ]}
            note={v.email ? <ContactLink kind="email" value={v.email} /> : undefined}
            actions={actions ? <VendorMenu vendor={v} actions={actions} /> : undefined}
          />
        )}
      />
    );
  }

  return <DataTable {...props} columns={columns} rowKey={(v) => v.id} onRowClick={onOpen} caption="Vendors" />;
}
