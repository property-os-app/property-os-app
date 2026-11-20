import type { ReactNode } from "react";
import { Badge, Num } from "@/components/atoms";
import { ListCard } from "@/components/molecules";
import { CardList } from "@/components/organisms";
import { formatCurrency, formatCurrencyShort, toCents } from "@/lib/format";
import { plural, unitLabel } from "@/lib/labels";
import { MonthStrip } from "@/features/rent-roll/MonthStrip";
import { isReservedRow, leaseTenantLabel, renewalAlertLabels, renewalAlertTone, rowTitle, yearRowKey, type PropertyGroup } from "@/features/rent-roll/yearStats";
import type { RentRollYearResponse, RentRollYearRow, RentRollYearTotals } from "@/types/rentRoll";

/** One item of the phone list: a property's subtotal card (before its rows) or a row card. */
type Item = { kind: "property"; group: PropertyGroup } | { kind: "row"; row: RentRollYearRow };

/** "Paid $X" with "of $Y · late fees $Z" under it (short money, so the card's title keeps its room), for the total and subtotal cards. */
function totalsAmount(t: RentRollYearTotals) {
  const late = toCents(t.lateFees) !== 0 ? ` · late fees ${formatCurrencyShort(t.lateFees)}` : "";
  return {
    label: "Paid",
    value: <Num title={formatCurrency(t.totalPaid)}>{formatCurrencyShort(t.totalPaid)}</Num>,
    caption: `of ${formatCurrencyShort(t.totalCharged)}${late}`,
  };
}

export interface YearCardsProps {
  data: RentRollYearResponse | undefined;
  groups: PropertyGroup[];
  year: number;
  state: "ideal" | "loading" | "empty" | "error";
  empty: { title: string; description: string; action?: ReactNode };
  error: { title: string; description?: string; onRetry?: () => void };
  /** Under the list (the "totals include all units" note). */
  note?: ReactNode;
  onOpen: (row: RentRollYearRow) => void;
}

/**
 * The yearly rent roll on phones (CardList): the grand total card on top, then per property a subtotal card followed by
 * one card per unit: the current tenant (or "Vacant" / "Reserved" with a grey badge), the unit,
 * the 12-month strip, the year's paid total and the renewal alert. A tap opens the current lease (or the Unit drawer).
 */
export function YearCards({ data, groups, year, state, empty, error, note, onOpen }: YearCardsProps) {
  const items: Item[] = groups.flatMap((g) => [{ kind: "property", group: g } as Item, ...g.rows.map((row): Item => ({ kind: "row", row }))]);
  return (
    <>
      <CardList<Item>
        caption={`Rent roll, ${year}`}
        rows={items}
        rowKey={(it) => (it.kind === "property" ? `property-${it.group.property.id}` : yearRowKey(it.row))}
        state={state}
        empty={empty}
        error={error}
        summary={
          data && state === "ideal" ? <ListCard className="mb-3 bg-surface-2" title={`Total ${year}`} subtitle="All properties in scope" amount={totalsAmount(data.totals)} /> : undefined
        }
        renderCard={(it) => {
          if (it.kind === "property") {
            const g = it.group;
            return <ListCard className="bg-surface-2" title={g.property.name} subtitle={`Property total · ${plural(g.rows.length, "unit")}`} amount={totalsAmount(g.totals)} />;
          }
          const r = it.row;
          const names = rowTitle(r);
          const reserved = isReservedRow(r);
          return (
            <ListCard
              title={r.lease ? leaseTenantLabel(r.lease, true) : names}
              subtitle={unitLabel(r.unit.unitNumber)}
              muted={!r.lease}
              badge={
                reserved ? <Badge tone="neutral">Reserved</Badge> : r.renewalAlert ? <Badge tone={renewalAlertTone[r.renewalAlert]}>{renewalAlertLabels[r.renewalAlert]}</Badge> : undefined
              }
              amount={{ label: `Paid ${year}`, value: <Num title={formatCurrency(r.totalPaid)}>{formatCurrencyShort(r.totalPaid)}</Num>, caption: `of ${formatCurrencyShort(r.totalCharged)}` }}
              note={<MonthStrip row={r} year={year} />}
              onOpen={() => onOpen(r)}
              openLabel={r.lease ? `Open lease ${r.lease.leaseNumber}, ${names}` : `Open ${unitLabel(r.unit.unitNumber)}, ${names.toLowerCase()}`}
            />
          );
        }}
      />
      {note && <p className="text-small text-text-secondary">{note}</p>}
    </>
  );
}
