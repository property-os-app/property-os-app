import { useState } from "react";
import { Avatar, Button, Caption, Select, Skeleton, Small } from "@/components/atoms";
import { Card, CardHeader, InlineError, toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useAssignManager, useManagers, usePropertyManagers, useRemoveManager } from "@/features/properties/hooks";
import type { ManagerSummary } from "@/types/manager";
import type { Property } from "@/types/property";

/** "Managers" card on the property detail. OWNER (canAssign) also gets Remove per manager and the Assign select. */
export function PropertyManagersCard({ property, canAssign }: { property: Property; canAssign: boolean }) {
  const managers = usePropertyManagers(property.id);
  const allManagers = useManagers();
  const assign = useAssignManager(property.id);
  const remove = useRemoveManager(property.id);
  const [userId, setUserId] = useState("");
  const [removing, setRemoving] = useState<ManagerSummary | null>(null);

  const assignedIds = new Set(managers.data?.map((m) => m.id));
  const available = allManagers.data?.filter((m) => !assignedIds.has(m.id)) ?? [];

  const onAssign = () => {
    const manager = available.find((m) => m.id === userId);
    if (!manager) return;
    assign.mutate(userId, {
      onSuccess: (assigned) => {
        toast.success(`${assigned.name} assigned to ${property.name}`);
        setUserId("");
      },
    });
  };

  const onRemove = () => {
    if (!removing) return;
    remove.mutate(removing.id, {
      onSuccess: (removed) => {
        toast.success(`${removed.name} removed from ${property.name}`);
        setRemoving(null);
      },
    });
  };

  return (
    <Card>
      <CardHeader title="Managers" />
      <div className="flex flex-col gap-4">
        {managers.isPending ? (
          <Skeleton className="h-10" />
        ) : managers.isError ? (
          <InlineError title="Couldn't load managers" description={errorText(managers.error)} onRetry={() => void managers.refetch()} />
        ) : managers.data.length === 0 ? (
          <Caption>No manager assigned</Caption>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {managers.data.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-text-primary">{m.name}</div>
                  <Small className="block truncate">{m.email}</Small>
                </div>
                {canAssign && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      remove.reset();
                      setRemoving(m);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canAssign &&
          (allManagers.isPending ? (
            <Skeleton className="h-10" />
          ) : allManagers.isError ? (
            <InlineError title="Couldn't load the manager list" onRetry={() => void allManagers.refetch()} />
          ) : available.length === 0 ? (
            <Caption>Every manager is already assigned.</Caption>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="assign-manager" className="text-small text-text-secondary">
                Assign manager
              </label>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    id="assign-manager"
                    value={userId}
                    invalid={assign.isError}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      assign.reset();
                    }}
                  >
                    <option value="">Choose a manager</option>
                    {available.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button onClick={onAssign} disabled={!userId || assign.isPending} aria-busy={assign.isPending || undefined}>
                  {assign.isPending ? "Assigning..." : "Assign"}
                </Button>
              </div>
              {assign.isError && <InlineError title={errorText(assign.error)} />}
            </div>
          ))}
      </div>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove manager?"
        consequence={removing ? `${removing.name} will no longer see ${property.name}, its units or its leases.` : ""}
        confirmLabel="Remove"
        destructive
        onConfirm={onRemove}
        busy={remove.isPending}
        error={remove.isError ? errorText(remove.error) : null}
      />
    </Card>
  );
}
