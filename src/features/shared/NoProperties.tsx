import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/atoms";
import { Card, EmptyState } from "@/components/molecules";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";

/**
 * The page body when the user has no properties (GET /properties returned []). A manager is told to ask the owner;
 * an owner gets the welcome with "Add property" (`onAdd`, shown only with property.create).
 */
export function NoProperties({ onAdd }: { onAdd?: () => void }) {
  const { me } = useAuth();
  const role = me!.role;
  const isOwner = role === "OWNER";
  return (
    <Card padding="none">
      {isOwner ? (
        <EmptyState
          icon={<Building2 strokeWidth={1.5} />}
          title="Add your first property"
          description="Start with a property, then add its units, tenants and leases."
          action={
            onAdd && can(role, "property.create") ? (
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
