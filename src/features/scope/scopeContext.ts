import { createContext, useContext } from "react";

export interface ScopeContextValue {
  /** The chosen property, or null for "All properties". */
  propertyId: string | null;
  /** Shown in the Sidebar scope button and the Topbar chip. */
  label: string;
  setPropertyId: (propertyId: string | null) => void;
  /** Opens the "Choose property" modal. */
  openPicker: () => void;
}

export const ScopeContext = createContext<ScopeContextValue | null>(null);

/** Reads the property scope. Units, Leases and Rent Roll filter by propertyId. Only works inside ScopeProvider. */
export function useScope(): ScopeContextValue {
  const value = useContext(ScopeContext);
  if (!value) throw new Error("useScope must be used inside ScopeProvider");
  return value;
}
