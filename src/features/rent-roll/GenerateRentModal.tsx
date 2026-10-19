import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Body, Button } from "@/components/atoms";
import { InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatMonth } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useLeases } from "@/features/leases/hooks";
import { useGenerateRent } from "@/features/rent-roll/hooks";
import { isFutureMonth, isPastMonth, skippedLeases, type SkippedLease } from "@/features/rent-roll/stats";
import type { GenerateRentResponse } from "@/types/rentRoll";

/** Named leases shown in the toast before "+{n} more". */
const MAX_NAMED = 3;

/** "Skipped: Sophia Nguyen (starts Oct 14, first rent Nov 1), ... +2 more." */
function skippedText(list: SkippedLease[]): string {
  const named = list.slice(0, MAX_NAMED).map((s) => `${s.name} (${s.reason})`).join(", ");
  const more = list.length > MAX_NAMED ? ` +${list.length - MAX_NAMED} more` : "";
  return `Skipped: ${named}${more}.`;
}

/**
 * Result toast: "{n} rent charges created", or "Nothing new to bill for {Month}" when nothing was created.
 * The description names the leases skipped as outside the term or not monthly (from `skipped`, the same rule on the
 * visible leases); without the leases it falls back to the counts.
 */
function showResult(r: GenerateRentResponse, skipped: SkippedLease[] | null) {
  const outside = r.skippedNonMonthly + r.skippedOutsideTerm;
  const parts = [
    r.skippedExisting > 0 ? `${r.skippedExisting} already billed.` : null,
    outside > 0 && skipped && skipped.length > 0
      ? skippedText(skipped)
      : [r.skippedNonMonthly > 0 ? `${r.skippedNonMonthly} not monthly` : null, r.skippedOutsideTerm > 0 ? `${r.skippedOutsideTerm} outside the lease term` : null]
          .filter(Boolean)
          .join(", ") || null,
  ].filter(Boolean);
  const description = parts.length > 0 ? parts.join(" ") : undefined;
  if (r.created === 0) toast.success(`Nothing new to bill for ${formatMonth(r.month)}`, { description });
  else toast.success(`${plural(r.created, "rent charge")} created`, { description });
}

/** "Generate rent for {Month}": POST /rent-roll/generate { month } for every property the user can see. Mount it only while open. */
export function GenerateRentModal({ month, onClose }: { month: string; onClose: () => void }) {
  const generate = useGenerateRent();
  // Generate bills every visible property, so the skipped names come from all visible ACTIVE leases (not the scope).
  const leases = useLeases({ status: "ACTIVE" });
  const [error, setError] = useState<string | null>(null);
  const label = formatMonth(month);
  const warning = isPastMonth(month)
    ? `${label} is in the past. Charges will be due on past dates, so unpaid ones show as overdue right away.`
    : isFutureMonth(month)
      ? `${label} hasn't started yet. The new charges count in lease balances right away.`
      : null;

  const confirm = async () => {
    setError(null);
    try {
      const result = await generate.mutateAsync(month);
      showResult(result, leases.data ? skippedLeases(leases.data, month) : null);
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !generate.isPending && onClose()}
      title={`Generate rent for ${label}`}
      footer={
        <>
          <Button disabled={generate.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={generate.isPending} aria-busy={generate.isPending || undefined} onClick={() => void confirm()}>
            {generate.isPending ? "Generating..." : "Generate rent"}
          </Button>
        </>
      }
    >
      <Body className="m-0">
        Creates a rent charge for every active monthly lease on all your properties that doesn't have one for this month yet. Safe to run more than once.
      </Body>
      {warning && (
        <div role="note" className="flex items-start gap-2 rounded-control border border-warning/40 bg-warning-soft px-3 py-2.5 text-small text-text-primary">
          <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning" />
          <span>{warning}</span>
        </div>
      )}
      {error && <InlineError title="Couldn't generate rent" description={error} />}
    </Modal>
  );
}
