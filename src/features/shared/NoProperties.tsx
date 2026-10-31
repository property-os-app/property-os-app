import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/atoms";
import { Card, EmptyState } from "@/components/molecules";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";

/**
 * The page body when the user has no properties (GET /properties returned []). With property.create (the owner, or a
 * manager the owner allowed) it shows "Add property" (`onAdd`); otherwise a manager is told to ask the owner.
 */
export function NoProperties({ onAdd }: { onAdd?: () => void }) {
  const { me } = useAuth();
  const user = me!;
  const canCreate = can(user, "property.create");
  return (
    <Card padding="none">
      {canCreate ? (
        <EmptyState
          icon={<Building2 strokeWidth={1.5} />}
          title={user.role === "OWNER" ? "Add your first property" : "No properties assigned to you yet"}
          description={
            user.role === "OWNER"
              ? "Start with a property, then add its units, tenants and leases."
              : "Add a property (you'll manage it), or ask the owner to assign you one."
          }
          action={
            onAdd ? (
              <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} onClick={onAdd}>
                Add property
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmptyState icon={<Building2 strokeWidth={1.5} />} title="No properties assigned to you yet" description="Ask the owner to assign you a property." />
      )}
    </Card>
  );
}
