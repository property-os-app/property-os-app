/** Vendors page KPIs, filter options, search and filters, all on the client (GET /vendors has no paging). */
import { compareNatural } from "@/lib/sort";
import type { Vendor, VendorInsuranceStatus } from "@/types/vendor";

export interface VendorKpis {
  /** Active vendors. */
  total: number;
  /** Different trades among them. */
  trades: number;
  expiring: number;
  expired: number;
  /** No insurance on file. */
  none: number;
}

/** KPIs over the active (non-archived) vendors, ignoring the page's filters. */
export function vendorKpis(vendors: Vendor[]): VendorKpis {
  const active = vendors.filter((v) => v.archivedAt === null);
  const count = (s: VendorInsuranceStatus) => active.filter((v) => v.insuranceStatus === s).length;
  return {
    total: active.length,
    trades: new Set(active.map((v) => v.trade)).size,
    expiring: count("EXPIRING"),
    expired: count("EXPIRED"),
    none: count("NONE"),
  };
}

/** Service areas for the filter: trimmed, once each ignoring case (first spelling wins), A→Z. */
export function serviceAreas(vendors: Vendor[]): string[] {
  const seen = new Map<string, string>();
  for (const v of vendors) {
    const area = v.serviceArea?.trim();
    if (area && !seen.has(area.toLowerCase())) seen.set(area.toLowerCase(), area);
  }
  return [...seen.values()].sort(compareNatural);
}

export type VendorFilters = {
  trade: string;
  insurance: "all" | VendorInsuranceStatus;
  area: string;
  /** "active" hides archived vendors; "all" shows them too. */
  show: "active" | "all";
};

export const initialVendorFilters: VendorFilters = { trade: "all", insurance: "all", area: "all", show: "active" };

/** Same fields as the server search: name, contact name and trade label. */
export function vendorSearchText(v: Vendor, tradeLabel: string): string[] {
  return [v.name, v.contactName ?? "", tradeLabel];
}

/** One vendor against the filters. The service area matches ignoring case. */
export function matchesVendorFilters(v: Vendor, f: VendorFilters): boolean {
  if (f.show === "active" && v.archivedAt !== null) return false;
  if (f.trade !== "all" && v.trade !== f.trade) return false;
  if (f.insurance !== "all" && v.insuranceStatus !== f.insurance) return false;
  if (f.area !== "all" && v.serviceArea?.trim().toLowerCase() !== f.area.toLowerCase()) return false;
  return true;
}
