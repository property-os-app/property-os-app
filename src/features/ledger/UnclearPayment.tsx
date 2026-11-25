import { InlineError } from "@/components/molecules";
import { formatCurrency, formatDate } from "@/lib/format";
import { UNCLEAR_PAYMENT_MESSAGE } from "@/features/ledger/paymentForm";
import type { LedgerEntry } from "@/types/ledger";

/** After a payment without a clear answer: what the reloaded ledger says. Save stays locked until it has been reloaded. */
export type UnclearState = { status: "checking" | "failed" | "missing" } | { status: "found"; entry: LedgerEntry };

const TEXT: Record<"checking" | "failed" | "missing", string> = {
  checking: "Checking the ledger...",
  failed: "The ledger couldn't load, so check again before trying again.",
  missing: "It isn't in the ledger right now.",
};

/** "We didn't get an answer ..." over the Record Payment form. */
export function UnclearPayment({ state }: { state: UnclearState }) {
  const text =
    state.status === "found"
      ? `${state.entry.number} for ${formatCurrency(state.entry.amount)} on ${formatDate(state.entry.date)} is in the ledger, so it was probably saved.`
      : TEXT[state.status];
  return <InlineError title={UNCLEAR_PAYMENT_MESSAGE} description={text} />;
}
