import { useCallback, useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { Badge, Button, Checkbox, H2, Small } from "@/components/atoms";
import { toast } from "@/components/molecules";
import { Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { plural } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { SettingsFrame } from "@/features/settings/SettingsFrame";
import { useArchiveTemplate, useLeaseTemplates, useSetDefaultTemplate } from "@/features/lease-templates/hooks";
import { ArchiveTemplateDialog, DeleteTemplateDialog } from "@/features/lease-templates/TemplateConfirms";
import { TemplateEditor } from "@/features/lease-templates/TemplateEditor";
import { TemplatesTable, type TemplateRowActions } from "@/features/lease-templates/TemplatesTable";
import type { LeaseTemplateListItem } from "@/types/leaseTemplate";

type Editing = { id: string } | "new" | null;
type Confirming = { kind: "archive" | "delete"; template: LeaseTemplateListItem } | null;

/**
 * /settings/templates: the lease template library (Owner and every manager). Without templates.manage it is read-only:
 * no New template, and a row opens the template to view and preview. Archived ones only with "Show archived".
 */
export function TemplatesPage() {
  const { me } = useAuth();
  const canManage = can(me!, "template.manage");
  const [showArchived, setShowArchived] = useState(false);
  const templates = useLeaseTemplates({ includeArchived: showArchived });
  const [editing, setEditing] = useState<Editing>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const { mutate: setDefault } = useSetDefaultTemplate();
  const { mutate: archive } = useArchiveTemplate();

  const onSetDefault = useCallback(
    (t: LeaseTemplateListItem, isDefault: boolean) =>
      setDefault(
        { id: t.id, isDefault },
        {
          onSuccess: (saved) => toast.success(isDefault ? `${saved.name} is now the default template` : `${saved.name} is no longer the default`),
          onError: (err) => toast.error(errorText(err)),
        },
      ),
    [setDefault],
  );

  const onUnarchive = useCallback(
    (t: LeaseTemplateListItem) =>
      archive(
        { id: t.id, archive: false },
        { onSuccess: (saved) => toast.success(`Unarchived ${saved.name}`), onError: (err) => toast.error(errorText(err)) },
      ),
    [archive],
  );

  const actions = useMemo<TemplateRowActions>(
    () => ({
      canManage,
      onOpen: (t) => setEditing({ id: t.id }),
      onSetDefault,
      onArchive: (t) => setConfirming({ kind: "archive", template: t }),
      onUnarchive,
      onDelete: (t) => setConfirming({ kind: "delete", template: t }),
    }),
    [canManage, onSetDefault, onUnarchive],
  );

  const rows = templates.data ?? [];
  const state = templates.isPending ? "loading" : templates.isError ? "error" : rows.length === 0 ? "empty" : "ideal";

  const empty = canManage
    ? {
        icon: <FileText strokeWidth={1.5} />,
        title: showArchived ? "No lease templates" : "No lease templates yet",
        description: "Write a lease once, with fields like the tenant's name and the rent filled in for each lease.",
        action: (
          <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setEditing("new")}>
            New template
          </Button>
        ),
      }
    : { icon: <FileText strokeWidth={1.5} />, title: "No lease templates yet", description: "Ask the owner to add one." };

  return (
    <SettingsFrame active="templates">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <H2>Lease templates</H2>
          <Small>
            {canManage
              ? "The documents leases are printed from. Editing a template saves a new version; leases keep the version they use."
              : "The documents leases are printed from. Ask the owner for \"Manage lease templates\" to change them."}
          </Small>
        </div>
        {canManage && (
          <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setEditing("new")} className="max-md:w-full">
            New template
          </Button>
        )}
      </div>

      <Toolbar>
        <Checkbox label="Show archived" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        {templates.isSuccess && (
          <Badge tone="neutral" dot={false} className="ml-auto shrink-0">
            {plural(rows.length, "template")}
          </Badge>
        )}
      </Toolbar>

      <TemplatesTable
        rows={rows}
        state={state}
        empty={empty}
        error={{ title: "Couldn't load lease templates", description: templates.isError ? errorText(templates.error) : undefined, onRetry: () => void templates.refetch() }}
        actions={actions}
      />

      {editing && (
        <TemplateEditor templateId={editing === "new" ? undefined : editing.id} readOnly={!canManage} onClose={() => setEditing(null)} />
      )}
      {confirming?.kind === "archive" && <ArchiveTemplateDialog template={confirming.template} onClose={() => setConfirming(null)} />}
      {confirming?.kind === "delete" && <DeleteTemplateDialog template={confirming.template} onClose={() => setConfirming(null)} />}
    </SettingsFrame>
  );
}
