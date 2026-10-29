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
  /** Sum of activeTickets (assigned + in progress). */
  activeJobs: number;
  /** Vendors with at least one active ticket. */
  vendorsWithJobs: number;
  /** All ratings averaged (each vendor's rating weighted by its ratingCount), 1 decimal; null when nobody is rated. */
  averageRating: number | null;
  /** Ratings behind averageRating. */
  ratingCount: number;
}

/** Average of every rating: Σ(rating × ratingCount) ÷ Σ ratingCount, 1 decimal. The per-vendor ratings are already rounded, so it can be 0.1 off. */
export function averageRating(vendors: Pick<Vendor, "rating" | "ratingCount">[]): { average: number | null; count: number } {
  const rated = vendors.filter((v) => v.rating !== null && v.ratingCount > 0);
  const count = rated.reduce((n, v) => n + v.ratingCount, 0);
  if (count === 0) return { average: null, count: 0 };
  const sum = rated.reduce((n, v) => n + v.rating! * v.ratingCount, 0);
  return { average: Math.round((sum / count) * 10) / 10, count };
}

/** KPIs over the active (non-archived) vendors, ignoring the page's filters. */
export function vendorKpis(vendors: Vendor[]): VendorKpis {
  const active = vendors.filter((v) => v.archivedAt === null);
  const count = (s: VendorInsuranceStatus) => active.filter((v) => v.insuranceStatus === s).length;
  const rating = averageRating(active);
  return {
    total: active.length,
    trades: new Set(active.map((v) => v.trade)).size,
    expiring: count("EXPIRING"),
    expired: count("EXPIRED"),
    none: count("NONE"),
    activeJobs: active.reduce((n, v) => n + v.activeTickets, 0),
    vendorsWithJobs: active.filter((v) => v.activeTickets > 0).length,
    averageRating: rating.average,
    ratingCount: rating.count,
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

/**
 * True while nothing we can see uses the vendor: no expense, no resolved or active ticket. Cancelled tickets (and open ones
 * that once had it) aren't counted on the vendor, so the server can still answer 409 with both counts.
 */
export function maybeDeletable(v: Vendor): boolean {
  return v.expenseCount === 0 && v.jobsCount === 0 && v.activeTickets === 0;
}
