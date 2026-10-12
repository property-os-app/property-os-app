import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Num, Skeleton, Small } from "@/components/atoms";
import { Card, CardHeader, InlineError, KeyValueList, toast } from "@/components/molecules";
import { PageHeader } from "@/components/organisms";
import { apiFetch, errorText } from "@/lib/api";
import { authReady } from "@/lib/firebase";
import {
  centsToAmount,
  currentMonth,
  formatCurrency,
  formatDate,
  leaseCountdown,
  todayISO,
  toCents,
} from "@/lib/format";

/** TEMPORARY setup check page. Delete in the next step. */
export function DevCheckPage() {
  const health = useQuery({
    queryKey: ["health"],
    // Response shape not in docs/api-samples yet, so we only check that it succeeds.
    queryFn: ({ signal }) => apiFetch<unknown>("/health", { signal }),
  });

  const firebase = useQuery({
    queryKey: ["dev", "authReady"],
    queryFn: async () => ((await authReady) ? "signed in" : "signed out"),
  });

  const formatItems = [
    ['formatCurrency("1200.00")', formatCurrency("1200.00")],
    ['formatCurrency("-150.00")', formatCurrency("-150.00")],
    ['formatCurrency("2500")', formatCurrency("2500")],
    ['formatCurrency("2500.5")', formatCurrency("2500.5")],
    ["formatCurrency(null)", formatCurrency(null)],
    ['formatDate("2026-11-01")', formatDate("2026-11-01")],
    ['formatDate("2026-11-01T00:00:00.000Z")', formatDate("2026-11-01T00:00:00.000Z")],
    ['leaseCountdown("2026-12-31").label', leaseCountdown("2026-12-31").label],
    ["todayISO()", todayISO()],
    ["currentMonth()", currentMonth()],
    ['toCents("2500.5")', String(toCents("2500.5"))],
    ["centsToAmount(250050)", String(centsToAmount(250050))],
  ].map(([input, output]) => ({ label: <Num>{input}</Num>, value: <Num>{output}</Num> }));

  return (
    <main className="mx-auto flex max-w-content flex-col gap-6 p-6">
      <PageHeader
        title="Setup check"
        description="Temporary page to check the backend, formatting and Firebase."
        actions={
          <Button variant="primary" onClick={() => toast.success("Test toast shown")}>
            Show test toast
          </Button>
        }
      />

      {health.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : health.isError ? (
        <InlineError title="Backend check failed" description={errorText(health.error)} onRetry={() => void health.refetch()} />
      ) : (
        <Card>
          <CardHeader title="Backend" description="GET /health" action={<Badge tone="success">Connected</Badge>} />
        </Card>
      )}

      <Card>
        <CardHeader title="Firebase" />
        {firebase.isPending ? (
          <Skeleton className="mt-3 h-5 w-48" />
        ) : (
          <Small>Firebase ready: {firebase.isError ? errorText(firebase.error) : firebase.data}</Small>
        )}
      </Card>

      <Card>
        <CardHeader title="Format check" description="Input on the left, output on the right." />
        <KeyValueList className="mt-4" items={formatItems} labelWidth={320} />
      </Card>
    </main>
  );
}
