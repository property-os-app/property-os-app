import { useMemo } from "react";
import { KeyRound } from "lucide-react";
import { Avatar, Caption, Small } from "@/components/atoms";
import { KebabMenu, ListCard } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { useIsMobile } from "@/lib/useIsMobile";
import { roleLabel } from "@/features/auth/permissions";
import type { UserRole } from "@/types/auth";
import type { ManagerListItem } from "@/types/manager";

/** One member row: the owner (from GET /auth/me, no `manager`) or a manager (from GET /managers). */
export interface MemberRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** "All properties", property names or "N properties". */
  scope: string;
  manager?: ManagerListItem;
}

type Props = Pick<DataTableProps<MemberRow>, "rows" | "state" | "empty" | "error"> & {
  onEditAccess: (manager: ManagerListItem) => void;
};

/** Members of Users and Permissions: a table from md up, cards on phones. Only manager rows get "Edit access". */
export function MembersTable({ onEditAccess, ...props }: Props) {
  const isMobile = useIsMobile();

  const menu = useMemo(
    () => (row: MemberRow) => {
      const manager = row.manager;
      if (!manager) return undefined;
      return <KebabMenu label={`Actions for ${row.name}`} items={[{ label: "Edit access", icon: <KeyRound strokeWidth={1.5} />, onSelect: () => onEditAccess(manager) }]} />;
    },
    [onEditAccess],
  );

  const columns = useMemo<Column<MemberRow>[]>(
    () => [
      {
        key: "member",
        header: "Member",
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={row.name} size={32} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{row.name}</div>
              <Caption className="block max-w-64 truncate">{row.email}</Caption>
            </div>
          </div>
        ),
      },
      { key: "role", header: "Role", cell: (row) => <Small>{roleLabel(row.role)}</Small> },
      {
        key: "scope",
        header: "Scope",
        cell: (row) => (
          <Small className="block max-w-80 truncate" title={row.scope}>
            {row.scope}
          </Small>
        ),
      },
      { key: "actions", header: <span className="sr-only">Actions</span>, width: 56, cell: menu },
    ],
    [menu],
  );

  if (isMobile) {
    return (
      <CardList
        rows={props.rows}
        state={props.state}
        empty={props.empty}
        error={props.error}
        rowKey={(r) => r.id}
        caption="Members"
        renderCard={(row) => {
          const manager = row.manager;
          return (
            <ListCard
              onOpen={manager ? () => onEditAccess(manager) : undefined}
              openLabel={manager ? `Edit access for ${row.name}` : undefined}
              leading={<Avatar name={row.name} size={32} />}
              title={row.name}
              subtitle={row.email}
              facts={[
                { label: "Role", value: roleLabel(row.role) },
                { label: "Scope", value: row.scope },
              ]}
              actions={menu(row)}
            />
          );
        }}
      />
    );
  }

  return (
    <DataTable
      {...props}
      columns={columns}
      rowKey={(r) => r.id}
      onRowClick={(row) => row.manager && onEditAccess(row.manager)}
      caption="Members"
    />
  );
}
