import { useState } from "react";
import { PropertyFormModal } from "@/features/properties/PropertyFormModal";
import { UnitFormModal } from "@/features/units/UnitFormModal";

/**
 * Add Property, then (when the form asked for a number of units) "Add unit 1 of N". `open()` starts it; render `modals`
 * once on the page. The state lives in the page, so the chain keeps going when the page switches from its
 * "no properties" state to the normal view after the first property is saved.
 */
export function useAddPropertyFlow() {
  const [formOpen, setFormOpen] = useState(false);
  // "Add unit {index} of {total}". null = no chain.
  const [chain, setChain] = useState<{ propertyId: string; index: number; total: number } | null>(null);

  const modals = (
    <>
      {formOpen && (
        <PropertyFormModal
          onClose={() => setFormOpen(false)}
          onCreated={(property, unitCount) => {
            if (unitCount > 0) setChain({ propertyId: property.id, index: 1, total: unitCount });
          }}
        />
      )}
      {chain && (
        <UnitFormModal
          // A new key per step gives each unit a fresh form.
          key={chain.index}
          defaultPropertyId={chain.propertyId}
          step={{ index: chain.index, total: chain.total }}
          onSaved={() => setChain((c) => (c && c.index < c.total ? { ...c, index: c.index + 1 } : null))}
          onClose={() => setChain(null)}
        />
      )}
    </>
  );

  return { open: () => setFormOpen(true), modals };
}
