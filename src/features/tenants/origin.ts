/** Where the tenant page was opened from: its first crumb (where Back goes) and its Sidebar item. No React, so it is unit-testable. */
import type { ModuleKey } from "@/components/organisms";
import type { Crumb } from "@/features/shared/DetailParts";

export type TenantOrigin = "tenants" | "lease" | "unit" | "tenant";

/** Router state from every link into /tenants/:id. Without `from` (pasted link, new tab) the parent is Tenants. */
export interface TenantPageState {
  from?: TenantOrigin;
  /** With from "lease": the crumb "Lease LSE-…" links to it. */
  lease?: { id: string; number: string };
  /** With from "unit": the crumb "Unit 4B, Maple Court" links to it. */
  unit?: { id: string; name: string };
  /** With from "tenant" (a co-tenant's page, Leaseholders card): the crumb names that tenant and links to it. */
  tenant?: { id: string; name: string };
}

/** The first crumb, the Sidebar item, and whether Back goes back in history (opened from inside the app). */
export function tenantParent(state: TenantPageState | null | undefined): { parent: Crumb; nav: ModuleKey; backInHistory: boolean } {
  const backInHistory = Boolean(state?.from);
  if (state?.from === "lease" && state.lease) {
    return { parent: { label: `Lease ${state.lease.number}`, to: `/leases/${encodeURIComponent(state.lease.id)}` }, nav: "leases", backInHistory };
  }
  if (state?.from === "unit" && state.unit) {
    return { parent: { label: state.unit.name, to: `/units/${encodeURIComponent(state.unit.id)}` }, nav: "units", backInHistory };
  }
  if (state?.from === "tenant" && state.tenant) {
    return { parent: { label: state.tenant.name, to: `/tenants/${encodeURIComponent(state.tenant.id)}` }, nav: "tenants", backInHistory };
  }
  return { parent: { label: "Tenants", to: "/tenants" }, nav: "tenants", backInHistory };
}

/** The tenant page path and the state for a link from a lease page. */
export function tenantFromLease(tenantId: string, lease: { id: string; leaseNumber: string }): { to: string; state: TenantPageState } {
  return { to: `/tenants/${encodeURIComponent(tenantId)}`, state: { from: "lease", lease: { id: lease.id, number: lease.leaseNumber } } };
}

