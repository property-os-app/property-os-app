import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { currentMonthUTC } from "@/lib/format";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import {
  atRiskLeases,
  attentionItems,
  billedPoint,
  expirationsByMonth,
  headerDescription,
  monthRange,
  overdueRows,
  rentCollection,
  unitCounts,
} from "@/features/dashboard/stats";
import { useLeases } from "@/features/leases/hooks";
import { expiresWithin } from "@/features/leases/stats";
import { useProperties } from "@/features/properties/hooks";
import { rentRollQuery, useRentRoll } from "@/features/rent-roll/hooks";
import { useUnits } from "@/features/units/hooks";

/** One dashboard section: `data` once every query it needs has loaded; `error` + `retry` (refetches the failed ones) when one failed. */
export interface Section<T> {
  data: T | undefined;
  isPending: boolean;
  error: unknown;
  retry: () => void;
}

function section<T>(queries: UseQueryResult[], compute: () => T): Section<T> {
  const failed = queries.filter((q) => q.isError);
  const pending = queries.some((q) => q.isPending);
  return {
    data: failed.length === 0 && !pending ? compute() : undefined,
    isPending: failed.length === 0 && pending,
    error: failed[0]?.error ?? null,
    retry: () => failed.forEach((q) => void q.refetch()),
  };
}

const CHART_MONTHS = 6;
const EXPIRY_MONTHS = 12;

/**
 * Every dashboard number, for the sidebar scope (propertyId or null for all) and the current UTC month.
 * Sections load and fail on their own. A future GET /dashboard endpoint should only need changes in this file.
 * Uses the same query keys as the Rent Roll, Units, Leases and Properties pages, so their caches are shared.
 */
export function useDashboardStats(scope: string | null) {
  const { me } = useAuth();
  const role = me!.role;
  const month = currentMonthUTC();
  const properties = useProperties();
  const units = useUnits({ propertyId: scope ?? undefined });
  const leases = useLeases({ propertyId: scope ?? undefined });
  const rentRoll = useRentRoll(month, scope);

  const chartMonths = monthRange(month, CHART_MONTHS);
  const history = useQueries({ queries: chartMonths.map((m) => rentRollQuery(m, scope)) });
  const expiryMonths = monthRange(month, EXPIRY_MONTHS, true);

  const header = section([properties, units], () => {
    const propertyName = scope ? (properties.data!.find((p) => p.id === scope)?.name ?? null) : null;
    return {
      noProperties: properties.data!.length === 0,
      description: headerDescription({ isOwner: role === "OWNER", propertyCount: properties.data!.length, unitCount: units.data!.length, propertyName, month }),
    };
  });

  const rent = section([rentRoll], () => rentCollection(rentRoll.data!));

  const kpis = section([units, leases, rentRoll], () => {
    const counts = unitCounts(units.data!);
    const active = leases.data!.filter((l) => l.status === "ACTIVE");
    const s = rentRoll.data!.summary;
    return {
      units: counts,
      // A percentage, not money.
      occupancyRate: counts.total > 0 ? (counts.OCCUPIED / counts.total) * 100 : null,
      expiring60: active.filter((l) => expiresWithin(l, 60)).length,
      expiring30: active.filter((l) => l.endingSoon).length,
      overdueCount: s.overdueCount,
      overdueTotal: s.overdueTotal,
    };
  });

  const atRisk = section([leases], () => atRiskLeases(leases.data!).slice(0, 5));
  const overdue = section([rentRoll], () => overdueRows(rentRoll.data!.rows).slice(0, 5));

  const billed = section(history, () => history.map((q, i) => billedPoint(chartMonths[i], q.data!)));
  const expirations = section([leases], () => expirationsByMonth(leases.data!, expiryMonths));
  const unitStatus = section([units], () => unitCounts(units.data!));

  const attention = section([rentRoll, leases], () => attentionItems({ month, roll: rentRoll.data!, leases: leases.data!, canCharge: can(role, "charge.create") }));

  return { month, header, rent, kpis, atRisk, overdue, billed, expirations, unitStatus, attention };
}
