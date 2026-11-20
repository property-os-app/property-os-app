import { Skeleton } from "@/components/atoms";
import { InlineError } from "@/components/molecules";
import { Drawer } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useUnit } from "@/features/units/hooks";
import { UnitDrawer } from "@/features/units/UnitDrawer";
import { unitLabel } from "@/lib/labels";

/**
 * The Unit drawer for a vacant row of the yearly Rent Roll. The row only has part of the unit, so this loads it
 * (GET /units/:id) and shows a placeholder drawer meanwhile. Lease links go back here through the browser history.
 */
export function YearUnitDrawer({ unitId, unitNumber, propertyName, onClose }: { unitId: string; unitNumber: string; propertyName: string; onClose: () => void }) {
  const unit = useUnit(unitId);
  if (unit.isSuccess) return <UnitDrawer unit={unit.data} propertyName={propertyName} leaseFrom={{ from: "rent-roll" }} onClose={onClose} />;
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()} title={`${unitLabel(unitNumber)}`} description={propertyName} size="lg">
      {unit.isError ? (
        <InlineError title="Couldn't load this unit" description={errorText(unit.error)} onRetry={() => void unit.refetch()} />
      ) : (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </Drawer>
  );
}
