import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Badge, Body, Button, Caption, Checkbox, H3, Overline, Skeleton, Small, Toggle } from "@/components/atoms";
import { InlineError, toast } from "@/components/molecules";
import { ConfirmDialog, Drawer } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useProperties } from "@/features/properties/hooks";
import { defaultKeys, groupCatalog, sameSet } from "@/features/settings/access";
import { useManagerAccess, usePermissionCatalog, useUpdateManagerAccess } from "@/features/settings/hooks";
import type { ManagerListItem } from "@/types/manager";

interface Draft {
  permissions: Set<string>;
  propertyIds: Set<string>;
}

function toggleIn(set: Set<string>, value: string, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

/**
 * "Edit access" for one manager (owner only): a property checklist and one switch per catalog permission.
 * Save sends both full lists in one PUT. Closing with unsaved changes asks first. Full screen on phones (Drawer).
 * Mount it only while open, so each opening starts from the saved access.
 */
export function EditAccessDrawer({ manager, onClose }: { manager: ManagerListItem; onClose: () => void }) {
  const access = useManagerAccess(manager.id);
  const catalog = usePermissionCatalog();
  const properties = useProperties();
  const save = useUpdateManagerAccess(manager.id);
  // null until the user changes something; until then the form shows the saved access.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const saved: Draft | null = access.data ? { permissions: new Set(access.data.permissions), propertyIds: new Set(access.data.propertyIds) } : null;
  const current = draft ?? saved;
  const dirty = Boolean(draft && saved && (!sameSet(draft.permissions, saved.permissions) || !sameSet(draft.propertyIds, saved.propertyIds)));
  const ready = current !== null && catalog.isSuccess && properties.isSuccess;

  const update = (change: (d: Draft) => Partial<Draft>) => {
    if (!current) return;
    save.reset();
    setDraft({ ...current, ...change(current) });
  };

  /** Drawer close (X, Escape, outside tap) and Cancel: ask first when there are unsaved changes. */
  const confirmClose = () => {
    if (!dirty) return true;
    setConfirmingDiscard(true);
    return false;
  };
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSave = () => {
    if (!current || !catalog.data) return;
    // Permissions in catalog order; property ids as picked.
    const permissions = catalog.data.filter((c) => current.permissions.has(c.key)).map((c) => c.key);
    save.mutate(
      { permissions, propertyIds: [...current.propertyIds] },
      {
        onSuccess: () => {
          toast.success(`Access for ${manager.name} updated`);
          onClose();
        },
      },
    );
  };

  const loadError = access.error ?? catalog.error ?? properties.error;
  const retryLoad = () => {
    if (access.isError) void access.refetch();
    if (catalog.isError) void catalog.refetch();
    if (properties.isError) void properties.refetch();
  };

  let body;
  if (loadError) {
    body = <InlineError title="Couldn't load this manager's access" description={errorText(loadError)} onRetry={retryLoad} />;
  } else if (!ready) {
    body = (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48" />
      </div>
    );
  } else {
    const allIds = properties.data.map((p) => p.id);
    const allPicked = allIds.length > 0 && allIds.every((id) => current.propertyIds.has(id));
    const defaults = defaultKeys(catalog.data);
    const isDefault = sameSet(current.permissions, defaults);
    const sorted = [...properties.data].sort((a, b) => a.name.localeCompare(b.name));

    body = (
      <>
        {save.isError && <InlineError title={errorText(save.error)} />}

        <section aria-labelledby="access-properties" className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <H3 id="access-properties">Properties</H3>
            <Small>{manager.name} sees these properties with their units, leases and rent.</Small>
          </div>
          {sorted.length === 0 ? (
            <Caption>No properties yet.</Caption>
          ) : (
            <div className="flex flex-col rounded-control border border-border-subtle">
              <div className="border-b border-border-subtle px-3 py-1">
                <Checkbox
                  className="min-h-11 w-full"
                  label={<span className="font-semibold">Select all</span>}
                  checked={allPicked}
                  onChange={(e) => update(() => ({ propertyIds: new Set(e.target.checked ? allIds : []) }))}
                />
              </div>
              <div className="flex flex-col p-1.5">
                {sorted.map((p) => (
                  <Checkbox
                    key={p.id}
                    className="min-h-11 w-full rounded-control px-1.5 hover:bg-surface-3"
                    checked={current.propertyIds.has(p.id)}
                    onChange={(e) => update((d) => ({ propertyIds: toggleIn(d.propertyIds, p.id, e.target.checked) }))}
                    label={
                      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                        <span>{p.name}</span>
                        <Caption>
                          {p.city}, {p.state}
                        </Caption>
                      </span>
                    }
                  />
                ))}
              </div>
            </div>
          )}
          {current.propertyIds.size === 0 && (
            <Badge tone="warning" icon={<AlertTriangle size={14} strokeWidth={1.5} />} className="self-start whitespace-normal">
              {manager.name} won't see any property.
            </Badge>
          )}
        </section>

        <section aria-labelledby="access-permissions" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <H3 id="access-permissions">Permissions</H3>
              <Small>What {manager.name} may change. Viewing is always allowed on their properties.</Small>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={14} strokeWidth={1.5} />}
              disabled={isDefault}
              onClick={() => update(() => ({ permissions: new Set(defaults) }))}
            >
              Reset to defaults
            </Button>
          </div>
          {groupCatalog(catalog.data).map(({ group, items }) => (
            <div key={group} className="flex flex-col">
              <Overline className="pb-1">{group}</Overline>
              {items.map((item) => (
                <div key={item.key} className="flex min-h-11 items-center justify-between gap-4 border-b border-border-subtle py-2 last:border-b-0">
                  <div className="min-w-0">
                    <Body as="div">{item.label}</Body>
                    {item.default && <Caption>On by default</Caption>}
                  </div>
                  <Toggle
                    aria-label={item.label}
                    checked={current.permissions.has(item.key)}
                    onChange={(on) => update((d) => ({ permissions: toggleIn(d.permissions, item.key, on) }))}
                  />
                </div>
              ))}
            </div>
          ))}
        </section>
      </>
    );
  }

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      confirmClose={confirmClose}
      title="Edit access"
      description={`${manager.name} · ${manager.email}`}
      footer={
        <>
          <Button onClick={requestClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} disabled={!ready || !dirty || save.isPending} aria-busy={save.isPending || undefined}>
            {save.isPending ? "Saving..." : "Save changes"}
          </Button>
        </>
      }
    >
      {body}
      <ConfirmDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        title="Discard changes?"
        consequence={`Your changes to ${manager.name}'s access won't be saved.`}
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setConfirmingDiscard(false);
          onClose();
        }}
      />
    </Drawer>
  );
}
