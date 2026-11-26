import { useState } from "react";
import { Button } from "@/components/atoms";
import { InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { todayUTC } from "@/lib/format";
import { settledOnMin } from "@/features/deposits/endPreview";
import { useSaveDeposit } from "@/features/deposits/hooks";
import { SettlementForm } from "@/features/deposits/SettlementForm";
import {
  canSaveSettlement,
  hasErrors,
  leftToAssignCents,
  settlementBody,
  settlementDefaults,
  settlementErrors,
  splitSettlementErrors,
  type SettlementContext,
  type SettlementErrors,
} from "@/features/deposits/settlement";
import type { DepositResponse } from "@/types/deposit";
import type { Lease } from "@/types/lease";

/**
 * PUT /leases/:id/deposit in a modal: "Settle deposit", "Edit settlement", "Record settlement" (not tracked) or "Re-save
 * settlement". Prefilled from the saved settlement, else `suggested`, else a full refund. Save works only at $0.00 left to
 * assign; field errors show after the first Save, the backend's 400 / 409 inside. Mount it only while open.
 */
export function SettlementModal({ lease, deposit, title, onClose }: { lease: Lease; deposit: DepositResponse; title: string; onClose: () => void }) {
  const save = useSaveDeposit(lease.id);
  const [ctx] = useState<SettlementContext>(() => ({ totalHeld: deposit.totalHeld, maxApplicable: deposit.maxApplicable, minSettledOn: settledOnMin(lease), today: todayUTC() }));
  const [values, setValues] = useState(() => settlementDefaults(deposit, ctx.today));
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<SettlementErrors>({});
  const [formError, setFormError] = useState("");

  const local = settlementErrors(values, ctx);
  // The cap is shown right away; the other checks after the first Save.
  const shown: SettlementErrors = submitted ? { ...local, ...serverErrors } : { appliedToBalance: local.appliedToBalance, ...serverErrors };
  const balanced = leftToAssignCents(values, ctx.totalHeld) === 0;

  const submit = async () => {
    setSubmitted(true);
    setFormError("");
    setServerErrors({});
    if (!canSaveSettlement(values, ctx)) return;
    try {
      const saved = await save.mutateAsync(settlementBody(values));
      toast.success(deposit.settlement ? `Deposit settlement of ${saved.leaseNumber} updated` : `Deposit of ${saved.leaseNumber} settled`);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.messages.length > 0) {
        const split = splitSettlementErrors(err.messages, values.deductions.map((d) => d.key));
        setServerErrors(split.errors);
        setFormError(split.form.join(" ") || (hasErrors(split.errors) ? "" : errorText(err)));
      } else setFormError(errorText(err));
    }
  };

  return (
    <Modal
      open
      size="lg"
      onOpenChange={(open) => !open && !save.isPending && onClose()}
      title={`${title} · ${lease.leaseNumber}`}
      footer={
        <>
          <Button disabled={save.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={save.isPending || !balanced} aria-busy={save.isPending || undefined} onClick={() => void submit()}>
            {save.isPending ? "Saving..." : "Save settlement"}
          </Button>
        </>
      }
    >
      {formError && <InlineError title="Couldn't save the settlement" description={formError} />}
      <SettlementForm
        values={values}
        onChange={(next) => {
          setValues(next);
          setServerErrors({});
        }}
        ctx={ctx}
        openBalance={deposit.openBalance}
        securityDeposit={deposit.securityDeposit}
        petDeposit={deposit.petDeposit}
        errors={shown}
        disabled={save.isPending}
      />
    </Modal>
  );
}
