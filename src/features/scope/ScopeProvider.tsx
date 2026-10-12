import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useProperties } from "@/features/properties/hooks";
import { ScopeContext, type ScopeContextValue } from "@/features/scope/scopeContext";
import { ScopeModal } from "@/features/scope/ScopeModal";
import { clearSavedScope, readSavedScope, saveScope } from "@/features/scope/scopeStorage";

/** Holds the active property scope (one property or all) and renders the "Choose property" modal. */
export function ScopeProvider({ children }: { children: ReactNode }) {
  const [savedId, setSavedId] = useState(readSavedScope);
  const [pickerOpen, setPickerOpen] = useState(false);
  const properties = useProperties();
  const list = properties.data;

  // A saved id that is no longer in the list (deleted, unassigned) falls back to All properties.
  const isStale = Boolean(list && savedId && !list.some((p) => p.id === savedId));
  const propertyId = isStale ? null : savedId;

  useEffect(() => {
    if (isStale) clearSavedScope();
  }, [isStale]);

  const current = list?.find((p) => p.id === propertyId);
  const label = propertyId === null ? "All properties" : (current?.name ?? (properties.isPending ? "Loading..." : "Selected property"));

  const setPropertyId = useCallback((id: string | null) => {
    saveScope(id);
    setSavedId(id);
  }, []);

  const openPicker = useCallback(() => setPickerOpen(true), []);

  const value = useMemo<ScopeContextValue>(() => ({ propertyId, label, setPropertyId, openPicker }), [propertyId, label, setPropertyId, openPicker]);

  return (
    <ScopeContext value={value}>
      {children}
      <ScopeModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        properties={list}
        isPending={properties.isPending}
        error={properties.error}
        onRetry={() => void properties.refetch()}
        value={propertyId}
        onSelect={(id) => {
          setPropertyId(id);
          setPickerOpen(false);
        }}
      />
    </ScopeContext>
  );
}
