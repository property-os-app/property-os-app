/**
 * The Ledger tab's view in the URL: `?ledger=entries` for All entries (By month when missing), plus `payment=` / `card=`
 * for the payment or charge to scroll to and highlight. Changes replace the URL and keep the router state (Back still
 * knows where the lease page was opened from). `?view=` is not used: the Rent Roll's back link already uses it.
 */
import { useLocation, useSearchParams } from "react-router";

export type LedgerViewMode = "months" | "entries";

export function useLedgerParams() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const view: LedgerViewMode = params.get("ledger") === "entries" ? "entries" : "months";
  const focusPayment = view === "entries" ? params.get("payment") : null;
  const focusCard = view === "months" ? params.get("card") : null;

  const go = (next: LedgerViewMode, focus?: { payment?: string; card?: string }) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === "entries") out.set("ledger", "entries");
        else out.delete("ledger");
        out.delete("payment");
        out.delete("card");
        if (focus?.payment) out.set("payment", focus.payment);
        if (focus?.card) out.set("card", focus.card);
        return out;
      },
      { replace: true, preventScrollReset: true, state: location.state },
    );

  return {
    view,
    setView: (next: LedgerViewMode) => go(next),
    /** All entries, scrolled to this payment (highlighted). */
    showPayment: (paymentId: string) => go("entries", { payment: paymentId }),
    /** By month, scrolled to this charge's card (highlighted). */
    showCard: (chargeId: string) => go("months", { card: chargeId }),
    focusPayment,
    focusCard,
  };
}

/** The element id of a payment row (All entries) or a charge card (By month), for scrolling to it. */
export const entryAnchor = (id: string) => `ledger-entry-${id}`;
export const cardAnchor = (chargeId: string) => `ledger-card-${chargeId}`;
