import { useMemo } from "react";
import { Archive, ArchiveRestore, Eye, Pencil, Star, StarOff, Trash2 } from "lucide-react";
import { Caption, Num, Small } from "@/components/atoms";
import { KebabMenu, ListCard, StatusBadge, type MenuItem } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { formatTimestampDate } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { templateStatus } from "@/features/lease-templates/status";
import type { LeaseTemplateListItem } from "@/types/leaseTemplate";

/** What a row's kebab can do. Without `canManage` only Open (view). */
export interface TemplateRowActions {
  canManage: boolean;
  onOpen: (t: LeaseTemplateListItem) => void;
  onSetDefault: (t: LeaseTemplateListItem, isDefault: boolean) => void;
  onArchive: (t: LeaseTemplateListItem) => void;
  onUnarchive: (t: LeaseTemplateListItem) => void;
  onDelete: (t: LeaseTemplateListItem) => void;
}

type Props = Pick<DataTableProps<LeaseTemplateListItem>, "rows" | "state" | "empty" | "error"> & {
  /** Memoize it in the page, so the columns aren't rebuilt on every render. */
  actions: TemplateRowActions;
};

/** Kebab items for one template: Edit (or View), default on / off (not archived), Archive / Unarchive, Delete (unused only). */
function menuItems(t: LeaseTemplateListItem, a: TemplateRowActions): MenuItem[] {
  if (!a.canManage) return [{ label: "View", icon: <Eye strokeWidth={1.5} />, onSelect: () => a.onOpen(t) }];
  const items: MenuItem[] = [{ label: "Edit", icon: <Pencil strokeWidth={1.5} />, onSelect: () => a.onOpen(t) }];
  if (!t.archivedAt) {
    items.push(
      t.isDefault
        ? { label: "Remove default", icon: <StarOff strokeWidth={1.5} />, onSelect: () => a.onSetDefault(t, false) }
        : { label: "Set as default", icon: <Star strokeWidth={1.5} />, onSelect: () => a.onSetDefault(t, true) },
    );
    items.push({ label: "Archive", icon: <Archive strokeWidth={1.5} />, onSelect: () => a.onArchive(t) });
  } else {
    items.push({ label: "Unarchive", icon: <ArchiveRestore strokeWidth={1.5} />, onSelect: () => a.onUnarchive(t) });
  }
  if (t.leaseCount === 0) items.push({ label: "Delete", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => a.onDelete(t) });
  return items;
}

const usedText = (n: number) => (n === 0 ? "Not used" : plural(n, "lease"));

/** Lease templates in Settings: a table from md up, cards on phones. A row or card opens the editor (or the read-only view). */
export function TemplatesTable({ rows, state, empty, error, actions }: Props) {
  const isMobile = useIsMobile();

  const menu = useMemo(
    () => (t: LeaseTemplateListItem) => <KebabMenu label={`Actions for ${t.name}`} items={menuItems(t, actions)} />,
    [actions],
  );

  const columns = useMemo<Column<LeaseTemplateListItem>[]>(
    () => [
      {
        key: "name",
        header: "Template",
        cell: (t) => (
          <div className="min-w-0">
            <div className="truncate font-semibold">{t.name}</div>
            {t.description && (
              <Caption className="block max-w-96 truncate" title={t.description}>
                {t.description}
              </Caption>
            )}
          </div>
        ),
      },
      { key: "version", header: "Version", width: 96, cell: (t) => <Num>v{t.currentVersion}</Num> },
      { key: "used", header: "Used by", width: 120, cell: (t) => <Small>{usedText(t.leaseCount)}</Small> },
      { key: "updated", header: "Updated", width: 128, cell: (t) => <Small>{formatTimestampDate(t.updatedAt)}</Small> },
      { key: "status", header: "Status", width: 112, cell: (t) => <StatusBadge domain="template" status={templateStatus(t)} /> },
      { key: "actions", header: <span className="sr-only">Actions</span>, width: 56, cell: menu },
    ],
    [menu],
  );

  if (isMobile) {
    return (
      <CardList
        rows={rows}
        state={state}
        empty={empty}
        error={error}
        rowKey={(t) => t.id}
        caption="Lease templates"
        renderCard={(t) => (
          <ListCard
            onOpen={() => actions.onOpen(t)}
            openLabel={`${actions.canManage ? "Edit" : "View"} ${t.name}`}
            title={t.name}
            subtitle={t.description ?? undefined}
            badge={<StatusBadge domain="template" status={templateStatus(t)} />}
            facts={[
              { label: "Version", value: `v${t.currentVersion}` },
              { label: "Used by", value: usedText(t.leaseCount) },
              { label: "Updated", value: formatTimestampDate(t.updatedAt) },
            ]}
            muted={Boolean(t.archivedAt)}
            actions={menu(t)}
          />
        )}
      />
    );
  }

  return <DataTable rows={rows} state={state} empty={empty} error={error} columns={columns} rowKey={(t) => t.id} onRowClick={actions.onOpen} caption="Lease templates" />;
}
