import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { Button, Caption, Num, Select, Skeleton, Small } from "@/components/atoms";
import { Card, CardHeader, FormField, InlineError, KeyValueList, toast } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { LEAD_DAY_OPTIONS, leadDaysExample } from "@/features/settings/billing";
import { useBillingSettings, useRunBilling, useUpdateBilling } from "@/features/settings/hooks";
import { SettingsFrame } from "@/features/settings/SettingsFrame";
import { linkFocus } from "@/features/shared/linkClass";
import type { BillingRunResponse } from "@/types/billing";

/**
 * /settings/billing (Owner only; managers go to General): "Bill rent N days before the due date" with an example, Save,
 * and "Run billing now" with its result inline under the button (no modal, no toast for the result).
 */
export function BillingPage() {
  const { me } = useAuth();
  if (!can(me!, "billing.manage")) return <Navigate to="/settings" replace />;
  return (
    <SettingsFrame active="billing">
      <LeadDaysCard />
      <RunBillingCard />
    </SettingsFrame>
  );
}

function LeadDaysCard() {
  const settings = useBillingSettings();
  const update = useUpdateBilling();
  const saved = settings.data?.billingLeadDays;
  // The picked value; null = showing the saved one.
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? saved ?? null;
  const dirty = draft !== null && draft !== saved;
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value === null || !dirty) return;
    update.mutate(
      { billingLeadDays: value },
      {
        onSuccess: (s) => {
          setDraft(null);
          toast.success(`Rent now bills ${plural(s.billingLeadDays, "day")} before the due date`);
        },
      },
    );
  };

  return (
    <Card>
      {/* CardHeader's description is an uppercase eyebrow, so the explanation is body text under the title. */}
      <CardHeader title="Automatic rent billing" className="mb-1" />
      <Small className="mb-5 block">Every active monthly lease gets its rent charge a set number of days before its own due date. A daily job does this; nothing to press.</Small>
      {settings.isError ? (
        <InlineError title="Couldn't load the billing setting" description={errorText(settings.error)} onRetry={() => void settings.refetch()} />
      ) : value === null ? (
        <Skeleton className="h-[88px]" />
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col items-start gap-4">
          <FormField
            label="Bill rent"
            htmlFor="billing-lead-days"
            help={`${leadDaysExample(value)}. A change applies from the next run; charges already billed don't move.`}
            error={update.isError ? errorText(update.error) : undefined}
          >
            <div className="flex items-center gap-2">
              <Select
                id="billing-lead-days"
                className="w-24"
                value={value}
                invalid={update.isError}
                onChange={(e) => {
                  update.reset();
                  setDraft(Number(e.target.value));
                }}
              >
                {LEAD_DAY_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <Small>{value === 1 ? "day" : "days"} before the due date</Small>
            </div>
          </FormField>
          <Button type="submit" variant="primary" className="max-md:h-11 max-md:w-full" disabled={!dirty || update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      )}
    </Card>
  );
}

function RunBillingCard() {
  const run = useRunBilling();
  return (
    <Card>
      <CardHeader title="Run billing now" className="mb-1" />
      <Small className="mb-4 block">
        Runs today's billing at once, the same as the daily job. Safe to press any time: it never bills a month twice and never bills earlier months.
      </Small>
      <Button size="sm" className="max-md:h-11 max-md:w-full" disabled={run.isPending} onClick={() => run.mutate()}>
        {run.isPending ? "Running billing…" : "Run billing now"}
      </Button>
      {/* The result stays here, under the button, until the next run. */}
      <div aria-live="polite" className="mt-4 empty:mt-0">
        {run.isError && <InlineError title="Couldn't run billing" description={errorText(run.error)} onRetry={() => run.mutate()} />}
        {run.isSuccess && <RunResult result={run.data} />}
      </div>
    </Card>
  );
}

/** Created count, the skipped counts, then one line per created charge (lease number links to the lease). */
function RunResult({ result }: { result: BillingRunResponse }) {
  const { skipped, charges } = result;
  return (
    <div className="flex flex-col gap-4 rounded-control border border-border-subtle p-4">
      <div>
        <div className="font-semibold text-text-primary">{result.created === 0 ? "No new charges" : `${plural(result.created, "charge")} created`}</div>
        <Caption className="block">
          Ran {formatDate(result.today)} · billed rent due through {formatDate(result.billThrough)} ({plural(result.billingLeadDays, "day")} ahead)
        </Caption>
      </div>
      <KeyValueList
        labelWidth={170}
        items={[
          { label: "Already billed", value: <Num>{skipped.existing}</Num> },
          {
            label: "Not due for billing yet",
            value: <Num>{skipped.notYetDue}</Num>,
          },
          { label: "Not monthly", value: <Num>{skipped.nonMonthly}</Num> },
          {
            label: "Outside the lease term",
            value: <Num>{skipped.outsideTerm}</Num>,
          },
        ]}
      />
      {charges.length > 0 && (
        <ul className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0" aria-label="Charges created">
          {charges.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <Link to={`/leases/${encodeURIComponent(c.leaseId)}?tab=ledger`} className={`font-semibold text-success hover:underline ${linkFocus}`}>
                  {c.leaseNumber}
                </Link>
                <Small>{formatMonth(c.periodMonth)}</Small>
                <Caption>Due {formatDate(c.dueDate)}</Caption>
              </span>
              <Num className="font-semibold">{formatCurrency(c.amount)}</Num>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
