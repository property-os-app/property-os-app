import { PieChart } from "lucide-react";
import { Skeleton } from "@/components/atoms";
import { Card, CardHeader, EmptyState, InlineError } from "@/components/molecules";
import { HBarList } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { centsToAmount, formatCurrency, formatPercent, toCents } from "@/lib/format";
import type { ExpenseSummary } from "@/types/expense";

export interface CategoryBreakdownProps {
  summary: ExpenseSummary | undefined;
  pending: boolean;
  error: unknown;
  onRetry: () => void;
  /** "Year to date", "Last month"… */
  periodLabel: string;
  categoryLabel: (key: string) => string;
}

/** Side card "By category": a ranked bar list (label, amount, % of the total) of approved, non-voided expenses in the range. */
export function CategoryBreakdown({ summary, pending, error, onRetry, periodLabel, categoryLabel }: CategoryBreakdownProps) {
  return (
    <Card>
      <CardHeader title="By category" description={periodLabel} />
      {pending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : error ? (
        <InlineError title="Couldn't load the categories" description={errorText(error)} onRetry={onRetry} />
      ) : !summary || summary.byCategory.length === 0 ? (
        <EmptyState icon={<PieChart strokeWidth={1.5} />} title="No approved expenses" description="Nothing approved in this period yet. Pending expenses count once approved." />
      ) : (
        <HBarList
          stacked
          items={summary.byCategory.map((c) => ({ key: c.category, label: categoryLabel(c.category), value: toCents(c.total), detail: formatPercent(c.percent) }))}
          format={(cents) => formatCurrency(centsToAmount(cents))}
        />
      )}
    </Card>
  );
}
