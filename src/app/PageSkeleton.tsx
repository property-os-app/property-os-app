import { Skeleton } from "@/components/atoms";
import { Card } from "@/components/molecules";
import { KpiRow } from "@/components/organisms";

/** Placeholder for a page whose code is still downloading (lazy route): header, KPI row, toolbar and table rows. */
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading page</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <KpiRow>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-20" />
          </Card>
        ))}
      </KpiRow>
      <Skeleton className="h-10 w-full max-w-[360px]" />
      <Card padding="none" className="flex flex-col gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </Card>
    </div>
  );
}
