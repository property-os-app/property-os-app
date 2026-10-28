import { useMemo } from "react";
import { Avatar, Caption, Dash, Num, Small } from "@/components/atoms";
import { ListCard } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { useIsMobile } from "@/lib/useIsMobile";
import { ContactLink } from "@/features/shared/ContactLink";
import { InactiveBadge, InsuranceBadge, VendorMenu, type VendorActions } from "@/features/vendors/VendorParts";
import { rateText, tradeLine } from "@/features/vendors/vendorText";
import type { Vendor } from "@/types/vendor";

type Props = Pick<DataTableProps<Vendor>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  tradeLabel: (key: string) => string;
  onOpen: (v: Vendor) => void;
  actions?: VendorActions;
};

/**
 * The Table view of the vendor directory (from md up): Vendor and Expenses sort; on phones the same rows as cards
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
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={v.name} size={24} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{v.name}</span>
                <InactiveBadge vendor={v} />
              </div>
              {v.contactName && <Caption className="block max-w-56 truncate">{v.contactName}</Caption>}
            </div>
          </div>
        ),
      },
      { key: "trade", header: "Trade", cell: (v) => tradeLabel(v.trade) },
      { key: "area", header: "Service area", cell: (v) => v.serviceArea ?? <Dash /> },
      { key: "rate", header: "Rate", cell: (v) => (rateText(v) ? <Num>{rateText(v)}</Num> : <Dash />) },
      {
        key: "phone",
        header: "Phone",
        cell: (v) => (
          <Small>
            <ContactLink kind="phone" value={v.phone} />
          </Small>
        ),
      },
      { key: "insurance", header: "Insurance", cell: (v) => <InsuranceBadge vendor={v} /> },
      { key: "expenses", header: "Expenses", align: "right", sortable: true, cell: (v) => <Num>{v.expenseCount}</Num> },
    ];
    if (actions) cols.push({ key: "actions", header: <span className="sr-only">Actions</span>, width: 56, cell: (v) => <VendorMenu vendor={v} actions={actions} /> });
    return cols;
  }, [tradeLabel, actions]);

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
