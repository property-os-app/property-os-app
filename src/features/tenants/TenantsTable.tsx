import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Avatar, Caption, Dash, Small } from "@/components/atoms";
import { KebabMenu, ListCard, type MenuItem } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { useIsMobile } from "@/lib/useIsMobile";
import { ContactLink } from "@/features/shared/ContactLink";
import { BalanceValue, RentStatusBadge, TenantLeaseBadge } from "@/features/tenants/TenantParts";
import { rentStatus, unitLine, type TenantRow } from "@/features/tenants/stats";

type Props = Pick<DataTableProps<TenantRow>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  onOpen: (row: TenantRow) => void;
  /** Omit to hide the Edit item (role can't edit). */
  onEdit?: (row: TenantRow) => void;
  /** Omit to hide the Delete item (role can't delete). */
  onDelete?: (row: TenantRow) => void;
};

/**
 * The Table view of the tenants directory (from md up); on phones the same rows as cards. Row or card opens the
 * tenant drawer; Tenant and Balance sort.
 */
export function TenantsTable({ onOpen, onEdit, onDelete, ...props }: Props) {
  const isMobile = useIsMobile();
  const menu = useMemo(
    () => (row: TenantRow) => {
      const items: MenuItem[] = [];
      if (onEdit) items.push({ label: "Edit", icon: <Pencil strokeWidth={1.5} />, onSelect: () => onEdit(row) });
      if (onDelete) items.push({ label: "Delete", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => onDelete(row) });
      return items.length > 0 ? <KebabMenu label={`Actions for ${row.tenant.fullName}`} items={items} /> : undefined;
    },
    [onEdit, onDelete],
  );

  const columns = useMemo<Column<TenantRow>[]>(() => {
    const cols: Column<TenantRow>[] = [
      {
        key: "tenant",
        header: "Tenant",
        sortable: true,
        cell: ({ tenant }) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={tenant.fullName} size={24} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{tenant.fullName}</div>
              <Caption className="block max-w-64 truncate">
                <ContactLink kind="email" value={tenant.email} />
              </Caption>
            </div>
          </div>
        ),
      },
      { key: "phone", header: "Phone", cell: ({ tenant }) => (
          <Small>
            <ContactLink kind="phone" value={tenant.phone} />
          </Small>
        ),
      },
      {
        key: "unit",
        header: "Unit",
        cell: ({ current }) =>
          current ? (
            <div className="min-w-0">
              <div>Unit {current.unit.unitNumber}</div>
              <Caption className="block truncate">{current.unit.property.name}</Caption>
            </div>
          ) : (
            <Dash />
          ),
      },
      { key: "lease", header: "Lease", cell: ({ current }) => <TenantLeaseBadge lease={current} /> },
      { key: "rentStatus", header: "Rent status", cell: ({ current }) => <RentStatusBadge lease={current} /> },
      { key: "balance", header: "Balance", align: "right", sortable: true, cell: ({ current }) => <BalanceValue lease={current} /> },
    ];
    if (onEdit || onDelete) {
      cols.push({
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: 56,
        cell: menu,
      });
    }
    return cols;
  }, [onEdit, onDelete, menu]);

  if (isMobile) {
    return (
      <CardList
        rows={props.rows}
        state={props.state}
        empty={props.empty}
        error={props.error}
        footer={props.footer}
        rowKey={(r) => r.tenant.id}
        caption="Tenants"
        renderCard={(row) => {
          const { tenant, current } = row;
          return (
            <ListCard
              onOpen={() => onOpen(row)}
              openLabel={`Open ${tenant.fullName}`}
              leading={<Avatar name={tenant.fullName} size={32} />}
              title={tenant.fullName}
              subtitle={unitLine(current) ?? "No lease"}
              badge={<TenantLeaseBadge lease={current} />}
              amount={{ label: "Balance", value: <BalanceValue lease={current} /> }}
              // The strip means one thing only: behind on rent (the Rent status fact says "Overdue").
              strip={rentStatus(current) === "overdue"}
              facts={[
                { label: "Rent status", value: <RentStatusBadge lease={current} /> },
                { label: "Phone", value: <ContactLink kind="phone" value={tenant.phone} /> },
              ]}
              // Email on its own line: a third of the card would cut most addresses off.
              note={<ContactLink kind="email" value={tenant.email} />}
              actions={menu(row)}
            />
          );
        }}
      />
    );
  }

  // Same strip as the phone cards: behind on rent only (the Rent status column says "Overdue").
  return (
    <DataTable {...props} columns={columns} rowKey={(r) => r.tenant.id} onRowClick={onOpen} rowStrip={({ current }) => rentStatus(current) === "overdue"} caption="Tenants" />
  );
}
