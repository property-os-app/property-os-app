# src/features/deposits

Lease deposits and ending a lease: the deposit settlement (what happens to the security + pet deposit when a lease ends), the end preview (rent billed after the end date), and voiding that rent. Used by the lease page (Details tab, End lease). Rules: rules.md "Deposits" and "Leases" (End); API.md Deposits, POST /leases/:id/end, end-preview, void-charges-after-end.

## keys.ts
- `depositKeys.deposit(leaseId)`, `depositKeys.endPreview(leaseId, endedOn)`: under `["leases"]`, so every lease or money refresh also refreshes them.

## hooks.ts
- `useDeposit(leaseId)`: GET /leases/:id/deposit.
- `useSaveDeposit(leaseId)`: PUT /leases/:id/deposit (money.record), saves or replaces the settlement; sets the answer in the cache and refreshes money (ledger, rent roll, leases). Never retried.
- `useEndPreview(leaseId, endedOn, { enabled })`: GET /leases/:id/end-preview (`endedOn` "" = no query: an ended or cancelled lease); keeps the last answer while the next date loads.
- `useVoidChargesAfterEnd(leaseId)`: POST /leases/:id/void-charges-after-end (money.void).

## settlement.ts
No React, all tested.
- `SettlementValues` (`refundAuto`: the refund follows the rest of the deposit until the user types in it), `DeductionRow`, `SettlementContext`, `SettlementErrors`, `newDeduction()`: the form's state (money as `number | ""`, like `CurrencyInput`).
- `settlementDefaults(deposit, today)`: the saved settlement, else `suggested`, else a full refund of `totalHeld` (not tracked); settled today.
- `assignedCents`, `leftToAssignCents(values, totalHeld)`: the sum rule in integer cents. `leftToAssignView(cents)`: "$0.00 left to assign" (success), "$X left to assign" (warning), "Over by $X" (danger).
- `autoRefundCents(values, totalHeld)`: total held − deductions − applied, never below $0. `withAutoRefund`, `changeSettlement(values, key, value, totalHeld)` (one field changed: typing in the refund stops it following, any other change recalculates it), `refundTheRest` ("Refund the rest ($X)" turns following back on).
- `overDepositCents`, `overDepositText`: "Deductions are $X more than the deposit." when deductions (+ applied) go over it.
- `assignmentProblem(values, totalHeld)`: what to fix when it doesn't balance ("… are $X more than the $Y deposit. Lower the refund to $Z." / "Lower the deductions or the applied amount by $X." / "$X still to assign: …"), null when balanced.
- `settlementErrors(values, ctx)`: reasons 1–200, amounts above $0, at most 20 deductions, applied ≤ `maxApplicable`, settledOn from the lease's end to today, reference and notes lengths. `canSaveSettlement`: no errors and exactly $0.00 left.
- `settlementBody(values)`: the PUT body (numbers, trimmed text; refund date, method and reference only with a refund above $0, blank ones null).
- `splitSettlementErrors(messages, rowKeys)`: backend 400s (also `deposit.*` from /end) under their field or deduction row; the sum rule and 409s on top.

## endPreview.ts
No React, all tested.
- `previewRows(charges)`: month, invoice, description, amount, "paid $X → becomes credit". `chargesTotal(charges)`, `centsText(cents)`.
- `applicableCap(totalHeld, balance)`, `endMaxApplicable(preview, voiding)`: the "Apply to unpaid balance" cap inside End lease (balance after the voids when they are ticked). `balanceAfterEnd(preview, voiding)`.
- `endBody(choices)`: POST /leases/:id/end body (no `endedOn` on a cancel; `voidChargesAfterEnd` and `deposit` only when chosen). `endToast(saved)`: "Lease LSE-… ended · N charges voided · deposit settled".
- `settledOnMin(lease)`: endedOn, else cancelledOn, else startDate. `leaseDepositTotal(lease)`: security + pet. `depositBadge(status, totalHeld, leaseStatus)`: the badge key (NOT_TRACKED for an ended lease with a deposit and no status).

## SettlementForm.tsx
- `SettlementForm`: the settlement fields, controlled by the parent. Deposit held (security · pet), deductions (reason + amount, Add / Remove, up to 20), "Apply to unpaid balance" (help "Open balance $X · up to $Y", Max), refund amount (follows the rest of the deposit until typed in; then a "Refund the rest ($X)" link), refund date, method (no DEPOSIT) and reference (off at $0), settled on, notes, the "Deductions are $X more than the deposit" line under the deductions, and the live "Left to assign" counter (`role="status"`) with `assignmentProblem` under it. Used by `SettlementModal` and the End lease modal.

## SettlementModal.tsx
- `SettlementModal({ lease, deposit, title, onClose })`: "Settle deposit" / "Edit settlement" / "Record settlement" / "Re-save settlement" (PUT). Save only at $0.00 left; field errors after the first Save (the applied cap at once); backend errors inside. Toast "Deposit of LSE-… settled" / "Deposit settlement of LSE-… updated".

## DepositCard.tsx
- `DepositCard({ lease, canSettle, canUpload, onOpenDocuments, onShowPayment, focus })`: Details tab, ENDED / TERMINATED leases with a deposit. Status badge and total held; the saved settlement (deductions, applied to balance with its PMT link to the ledger, refund amount / date / method / reference, settled on, notes); "Not settled yet" or "Not tracked" text; refund proof count linking to Documents. Buttons: "Settle deposit" / "Edit settlement" / "Record settlement" (money.record) and "Upload refund proof" (our `DocumentUpload`, category Security deposit preselected; leases.manage). `appliedExceedsBalance`: amber warning with "Re-save settlement". Loading and error states. `DEPOSIT_CARD_ID` is its anchor.

## EndPreviewParts.tsx
- `PreviewList({ charges, muted })`: the preview's charges as a divided list. `BalanceLine({ now, after })`: "Balance now $X → after $Y" (credits green).

## VoidAfterEndModal.tsx
- `VoidAfterEndModal({ lease, onClose })`: "Void rent after the end date" on an ended lease: the preview's rent charges first (reason "Lease ended early" / "Lease cancelled before it started"), then POST void-charges-after-end; "nothing to void" when the list is empty.

## Tests (`npm test`)
- `settlement.test.ts`: the automatic refund (follows, stops after typing, "Refund the rest", $0.00 over the deposit), `assignmentProblem`, defaults (suggested, not tracked = full refund, edit), the left-to-assign math in cents and its view, the checks and Save rule, the body (refund details only with a refund), backend error routing.
- `endPreview.test.ts`: preview rows ("becomes credit"), totals, the deposit cap after the voids, the /end body, the toast, `settledOnMin`, `leaseDepositTotal`, `depositBadge`.
