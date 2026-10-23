import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Dash, Skeleton } from "@/components/atoms";
import { InlineError, KpiCard, type KpiCardProps } from "@/components/molecules";
import { KpiRow, PageHeader } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { BilledCollectedChart, ExpirationsChart, UnitsByStatusChart } from "@/features/dashboard/DashboardCharts";
import { AtRiskLeasesTable, OverdueRentTable } from "@/features/dashboard/DashboardTables";
import { useDashboardStats } from "@/features/dashboard/hooks";
import { NeedsAttention } from "@/features/dashboard/NeedsAttention";
import { useAddPropertyFlow } from "@/features/properties/AddPropertyFlow";
import { RentCollectionCard } from "@/features/dashboard/RentCollectionCard";
import { greeting, vacantNote } from "@/features/dashboard/stats";
import { GenerateRentModal } from "@/features/rent-roll/GenerateRentModal";
import { canGenerateRent } from "@/features/rent-roll/stats";
import { useScope } from "@/features/scope/scopeContext";
import { NoProperties } from "@/features/shared/NoProperties";

/** KpiCard links through the router (no full page reload). */
const renderLink: KpiCardProps["renderLink"] = (href, props) => <Link to={href} {...props} />;

/**
 * "/": the home page. Greeting + scope description, the rent collection card, 4 KPIs, then the design's
 * 8/4 grid (billed vs collected, at-risk leases, overdue rent, expirations | needs attention, units by status).
 * Every number comes from useDashboardStats (sidebar scope, current UTC month); each section loads and fails on its own,
 * except when the properties / units header fails or every section fails: then one page-level error with Retry.
 */
export function DashboardPage() {
  const { me } = useAuth();
  const user = me!;
  const { propertyId: scope } = useScope();
  const stats = useDashboardStats(scope);
  const { month, header, rent, kpis } = stats;

  const [generating, setGenerating] = useState(false);
  const addProperty = useAddPropertyFlow();
  const canGenerate = can(user, "rent.generate") && canGenerateRent(month);

  const title = greeting(me!.name);

  if (header.data?.noProperties) {
    return (
      <>
        <PageHeader title={title} />
        <NoProperties onAdd={addProperty.open} />
        {addProperty.modals}
      </>
    );
  }

  // Backend down: every section fails the same way, so show it once. The header failing also leaves nothing to show.
  const sections = [header, rent, kpis, stats.atRisk, stats.overdue, stats.billed, stats.expirations, stats.unitStatus, stats.attention];
  const pageError = header.error ?? (sections.every((s) => s.error != null) ? sections[0].error : null);
  if (pageError != null) {
    return (
      <>
        <PageHeader title={title} />
        <InlineError
          title="Couldn't load the dashboard"
          description={errorText(pageError)}
          onRetry={() => sections.forEach((s) => s.error != null && s.retry())}
        />
      </>
    );
  }

  const k = kpis.data;
  const kpi = (value: ReactNode) => (k ? value : <Skeleton className="h-10 w-24" />);

  return (
    <>
      <PageHeader
        title={title}
        description={header.data?.description ?? (header.isPending ? <Skeleton className="inline-block h-4 w-80 max-w-full" /> : undefined)}
      />

      <RentCollectionCard month={month} rent={rent} onGenerate={canGenerate ? () => setGenerating(true) : undefined} />

      {kpis.error ? (
        <InlineError title="Couldn't load the key numbers" description={errorText(kpis.error)} onRetry={kpis.retry} />
      ) : (
        <KpiRow>
          <KpiCard
            label="Occupancy rate"
            href="/units"
            renderLink={renderLink}
            value={kpi(k?.occupancyRate === null ? <Dash /> : formatPercent(k?.occupancyRate))}
            note={k ? (k.units.total === 0 ? "No units yet" : `${k.units.OCCUPIED} of ${plural(k.units.total, "unit")}`) : undefined}
          />
          <KpiCard
            label="Leases expiring soon"
            tone="warning"
            href="/leases"
            renderLink={renderLink}
            value={kpi(k?.expiring60)}
            delta={k ? { direction: "flat", label: "60 days" } : undefined}
            note={k ? `${k.expiring30} within 30 days` : undefined}
          />
          <KpiCard label="Vacant units" href="/units" renderLink={renderLink} value={kpi(k?.units.VACANT)} note={k ? vacantNote(k.units) : undefined} />
          <KpiCard
            label="Overdue tenants"
            tone="danger"
            href="/rent-roll"
            renderLink={renderLink}
            value={kpi(k?.overdueCount)}
            note={k ? (k.overdueCount === 0 ? "Nobody is overdue" : `${formatCurrency(k.overdueTotal)} overdue`) : undefined}
          />
        </KpiRow>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          <BilledCollectedChart billed={stats.billed} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <AtRiskLeasesTable atRisk={stats.atRisk} />
            <OverdueRentTable overdue={stats.overdue} />
          </div>
          <ExpirationsChart expirations={stats.expirations} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          <NeedsAttention attention={stats.attention} onGenerate={() => setGenerating(true)} />
          <UnitsByStatusChart unitStatus={stats.unitStatus} />
        </div>
      </div>

      {generating && <GenerateRentModal month={month} onClose={() => setGenerating(false)} />}
    </>
  );
}
