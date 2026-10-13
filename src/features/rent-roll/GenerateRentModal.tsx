import { useState } from "react";
import { Body, Button } from "@/components/atoms";
import { InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatMonth } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useGenerateRent } from "@/features/rent-roll/hooks";
import type { GenerateRentResponse } from "@/types/rentRoll";

/** Result toast: "{n} rent charges created" plus the non-zero skip counts, or "Rent for {Month} was already generated". */
function showResult(r: GenerateRentResponse) {
  const skipped = [
    r.skippedExisting > 0 ? `${r.skippedExisting} already billed` : null,
    r.skippedNonMonthly > 0 ? `${r.skippedNonMonthly} not monthly` : null,
    r.skippedOutsideTerm > 0 ? `${r.skippedOutsideTerm} outside the lease term` : null,
  ].filter(Boolean);
  const description = skipped.length > 0 ? skipped.join(", ") : undefined;
  if (r.created === 0 && r.skippedExisting > 0) toast.success(`Rent for ${formatMonth(r.month)} was already generated`, { description });
  else toast.success(`${plural(r.created, "rent charge")} created`, { description });
}

/** "Generate rent for {Month}": POST /rent-roll/generate { month } for every property the user can see. Mount it only while open. */
export function GenerateRentModal({ month, onClose }: { month: string; onClose: () => void }) {
  const generate = useGenerateRent();
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    try {
      showResult(await generate.mutateAsync(month));
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !generate.isPending && onClose()}
      title={`Generate rent for ${formatMonth(month)}`}
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
      {error && <InlineError title="Couldn't generate rent" description={error} />}
    </Modal>
  );
}
