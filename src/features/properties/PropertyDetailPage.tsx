import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Building2, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Avatar, Button, Caption, Dash, H1, Num, Overline, Skeleton, Small } from "@/components/atoms";
import { Card, CardHeader, EmptyState, InlineError, KebabMenu, KeyValueList, Tabs, toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { usePageTitle } from "@/app/pageTitle";
import { ApiError, errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { centsToAmount, formatCompactCurrency, formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { plural, propertyTypeLabels } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useLeases } from "@/features/leases/hooks";
import { useDeleteProperty, useProperty, usePropertyManagers } from "@/features/properties/hooks";
import { PropertyImage } from "@/features/properties/PropertyCard";
import { PropertyFormModal } from "@/features/properties/PropertyFormModal";
import { PropertyManagersCard } from "@/features/properties/PropertyManagersCard";
import { PropertyUnitsTable } from "@/features/properties/PropertyUnitsTable";
import { activeRentCentsByProperty, buildUnitRows, countUnits, formatAddress, needsAttention, occupancy } from "@/features/properties/stats";
import { useUnits } from "@/features/units/hooks";
import type { Property } from "@/types/property";

type Tab = "overview" | "units";

function Breadcrumb({ name }: { name: ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-small">
      <Link to="/properties" className="text-text-secondary no-underline hover:text-text-primary focus-visible:focus-ring">
        Properties
      </Link>
      <ChevronRight aria-hidden size={14} strokeWidth={1.5} className="shrink-0 text-text-muted" />
      <span className="truncate text-text-primary">{name}</span>
    </nav>
  );
}

/** Small KPI tile inside the header card. */
function Tile({ label, value, note, loading, className }: { label: string; value: ReactNode; note: ReactNode; loading: boolean; className?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-control border border-border-subtle p-4">
      <Overline>{label}</Overline>
      {loading ? <Skeleton className="h-7 w-20" /> : <Num className={cn("text-h2 font-bold text-text-primary", className)}>{value}</Num>}
      <Caption>{loading ? " " : note}</Caption>
    </div>
  );
}

/** /properties/:id: header card with KPIs and managers, Overview and Units tabs, edit and delete (OWNER). */
export function PropertyDetailPage() {
  const { id = "" } = useParams();
  const property = useProperty(id);
  usePageTitle(property.data?.name);

  // A 404 also means "not visible to this manager".
  if (property.error instanceof ApiError && property.error.status === 404) {
    return (
      <>
        <Breadcrumb name="Not found" />
        <Card padding="none">
          <EmptyState
            icon={<Building2 strokeWidth={1.5} />}
            title="Property not found"
            description="It doesn't exist, was deleted, or isn't assigned to you."
            action={
              <Link to="/properties" className="text-small font-semibold text-success hover:underline focus-visible:focus-ring">
                Back to Properties
              </Link>
            }
          />
        </Card>
      </>
    );
  }
  if (property.isError) {
    return (
      <>
        <Breadcrumb name="Property" />
        <InlineError title="Couldn't load this property" description={errorText(property.error)} onRetry={() => void property.refetch()} />
      </>
    );
  }
  if (property.isPending) {
    return (
      <>
        <Breadcrumb name={<Skeleton className="inline-block h-3 w-24" />} />
        <Card>
          <div className="flex flex-col gap-6 md:flex-row">
            <Skeleton className="h-[180px] w-full shrink-0 md:w-[280px]" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-96 max-w-full" />
              <Skeleton className="mt-2 h-20" />
            </div>
          </div>
        </Card>
      </>
    );
  }
  return <PropertyDetail property={property.data} />;
}

function PropertyDetail({ property }: { property: Property }) {
  const navigate = useNavigate();
  const { me } = useAuth();
  const role = me!.role;
  const units = useUnits({ propertyId: property.id });
  const leases = useLeases({ propertyId: property.id });
  const managers = usePropertyManagers(property.id);
  const del = useDeleteProperty();

  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(() => buildUnitRows(units.data ?? [], leases.data ?? []), [units.data, leases.data]);
  const attention = useMemo(() => rows.filter(needsAttention), [rows]);
  const counts = useMemo(() => countUnits(units.data ?? []), [units.data]);
  const rentCents = useMemo(() => activeRentCentsByProperty(leases.data ?? []).get(property.id) ?? 0, [leases.data, property.id]);

  const unitsLoading = units.isPending;
  const rentLoading = leases.isPending;
  const occ = occupancy(counts);
  const acquired = formatDate(property.acquisitionDate);

  const tableFailed = units.isError ? units : leases.isError ? leases : null;
  const tableState = tableFailed ? "error" : units.isPending || leases.isPending ? "loading" : "ideal";
  const tableError = {
    title: "Couldn't load units",
    description: tableFailed ? errorText(tableFailed.error) : undefined,
    onRetry: () => {
      if (units.isError) void units.refetch();
      if (leases.isError) void leases.refetch();
    },
  };

  const onDelete = () => {
    del.mutate(property.id, {
      onSuccess: () => {
        setDeleting(false);
        toast.success(`Property ${property.name} deleted`);
        navigate("/properties");
      },
    });
  };

  return (
    <>
      <Breadcrumb name={property.name} />

      <Card padding="none">
        <div className="flex flex-col gap-6 p-6 md:flex-row">
          <PropertyImage type={property.propertyType} className="h-[180px] w-full shrink-0 rounded-control md:w-[280px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <H1>{property.name}</H1>
                <Small className="mt-1 block">
                  {formatAddress(property)} · Acquired {acquired} · {unitsLoading ? "…" : plural(counts.total, "unit")}
                </Small>
              </div>
              {can(role, "property.edit") && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button icon={<Pencil size={16} strokeWidth={1.5} />} onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  {can(role, "property.delete") && (
                    <KebabMenu
                      label="Property actions"
                      items={[
                        {
                          label: "Delete property",
                          icon: <Trash2 strokeWidth={1.5} />,
                          destructive: true,
                          onSelect: () => {
                            del.reset();
                            setDeleting(true);
                          },
                        },
                      ]}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile label="Occupancy" loading={unitsLoading} value={formatPercent(occ)} note={`${counts.OCCUPIED} of ${plural(counts.total, "unit")}`} />
              <Tile
                label="Monthly rent"
                loading={rentLoading}
                value={formatCompactCurrency(centsToAmount(rentCents))}
                note="From active leases"
                className="text-success"
              />
              <Tile label="Units" loading={unitsLoading} value={counts.total} note={`${counts.VACANT} vacant`} />
              <Tile label="Current value" loading={false} value={formatCompactCurrency(property.propertyValue)} note={`Acquired ${acquired}`} />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {managers.isPending ? (
                <Skeleton className="h-6 w-48" />
              ) : managers.isError || managers.data.length === 0 ? (
                <Caption>{managers.isError ? "Managers couldn't be loaded" : "No manager assigned"}</Caption>
              ) : (
                managers.data.map((m) => (
                  <span key={m.id} className="flex items-center gap-2">
                    <Avatar name={m.name} size={24} />
                    <Small>{m.name}, Property Manager</Small>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="px-6">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            className="border-b-0"
            tabs={[
              { value: "overview", label: "Overview" },
              { value: "units", label: "Units", count: units.data?.length },
            ]}
          />
        </div>
      </Card>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card padding="none" className="self-start lg:col-span-8">
            <div className="px-5 pt-5">
              <CardHeader
                title="Units needing attention"
                action={
                  units.data && units.data.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setTab("units")}
                      className="text-small font-semibold text-success hover:underline focus-visible:focus-ring"
                    >
                      All {plural(units.data.length, "unit")}
                    </button>
                  ) : undefined
                }
              />
            </div>
            <PropertyUnitsTable
              caption="Units needing attention"
              rows={attention}
              state={tableState}
              error={tableError}
              empty={
                counts.total === 0
                  ? { title: "No units yet", description: "This property has no units." }
                  : { title: "All units are occupied.", description: "No vacant units and no leases ending soon." }
              }
            />
          </Card>
          <div className="flex flex-col gap-6 lg:col-span-4">
            <Card>
              <CardHeader title="Details" />
              <KeyValueList
                labelWidth={96}
                items={[
                  { label: "Type", value: propertyTypeLabels[property.propertyType] },
                  { label: "Address", value: formatAddress(property) },
                  { label: "Acquired", value: acquired },
                  { label: "Value", value: <Num>{formatCurrency(property.propertyValue)}</Num> },
                  { label: "Description", value: property.description ? <span className="whitespace-pre-line">{property.description}</span> : <Dash /> },
                ]}
              />
            </Card>
            <PropertyManagersCard property={property} canAssign={can(role, "manager.assign")} />
          </div>
        </div>
      ) : (
        <Card padding="none">
          <PropertyUnitsTable
            caption="Units"
            rows={rows}
            state={tableState}
            error={tableError}
            empty={{ title: "No units yet", description: "This property has no units." }}
          />
        </Card>
      )}

      {editing && <PropertyFormModal property={property} onClose={() => setEditing(false)} />}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete property?"
        consequence={`This permanently deletes ${property.name} and removes its manager assignments. A property that still has units or expenses can't be deleted.`}
        confirmLabel="Delete property"
        destructive
        typeToConfirm={property.name}
        onConfirm={onDelete}
        busy={del.isPending}
        error={del.isError ? errorText(del.error) : null}
      />
    </>
  );
}
