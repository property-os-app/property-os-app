# src/features/ledger

The lease ledger (lease page, Ledger tab): charges, payments, voids and re-entries. Every change refreshes the rent roll, every lease query (lists, details, ledgers) and tenants.

## hooks.ts
- `refreshAfterMoneyChange(qc)`: invalidates `["rent-roll"]`, `["leases"]` and `["tenants"]`. Also used by Run billing now.
- `useLedger(leaseId, { enabled? })`: GET /leases/:id/ledger (key `leaseKeys.ledger(id)`); the lease page turns it off for old leases.
- `ledgerQuery(leaseId)`: the same query options, for a one-off `fetchQuery` (Rent Roll Email reminder).
- `useAddCharge()`: POST /leases/:id/charges. `useRecordPayment()`: POST /leases/:id/payments (`{ leaseId, body, file, category }`; multipart with a file). Never retried by itself and never queued while offline; when the reply is unclear the ledger, rent roll and leases reload. `unclearPayment(err)`: the payment may have been saved although this error came back.
- `useVoidCharge()`, `useVoidPayment()`: POST .../void with `{ reason }` (owner, or a manager with `money.void`).

## paymentForm.ts
- `paymentRequest(body, file, category)`: JSON, or multipart with a file (`data` with `documentCategory` inside, and `file`). `ReceiptValue`, `receiptCategory(value, options)`: the picked receipt and the category to send (Receipt by default).
- `isUnclearReply(status)` (no answer or 5xx), `isPaymentAnswer(value)`, `findPayment(entries, body, known)` (the sent payment in the reloaded ledger), `UNCLEAR_PAYMENT_MESSAGE`.
- `receiptErrorField(message, status)`: messages that go under the receipt (file or category).

## proration.ts
- `RentProration`, `rentProration(lease, month)`: covered dates, days, days in month, full and prorated cents (rent x days / days in month, nearest cent, integer math), and whether the month's due date is outside the term. null when the lease covers the whole month.
- `rentDescription(month, proration?)`: "Monthly Rent - October 2026", with " (prorated, Oct 14–Oct 31)" when prorated.

## overdue.ts
- `balanceSplit(entries, balance)`, `BalanceSplit`: cents of the balance that are overdue (charges due before today, UTC) and not due yet (due after today), from the ledger. Payments pay the oldest charges first, so overdue = balance − non-voided charges due today or later (never below 0); not due yet = charges due after today, up to the balance. Stands in for a backend overdue amount (BACKEND REQUEST).

## balance.ts
- `balanceText(value)`: "$1,200.00", or "Credit $150.00" when negative.

## LedgerParts.tsx
- `BalanceText({ value, overdue, caption })`: a balance number, bold when owed and danger only with `overdue` (a balance above $0 isn't late: rent is billed up to 28 days early), success "Credit {amount}" when negative; `caption` ("Due Nov 1") under it, right-aligned. The ledger's running balance passes no `overdue`, so it is never red.

## LedgerView.tsx
- `LedgerView({ lease, canVoid, canCharge, canPay })`: compact full-width table newest first (date, description + number, method, charge, payment, running balance). The balance cards are tiles on the lease page now. Voided rows are muted with a strikethrough, a "Voided" badge and the reason. Kebab: "Void charge / payment" on live rows (`canVoid`), "Re-enter charge / payment" on voided rows (`canCharge` / `canPay`), which opens Add charge / Record Payment prefilled. Loading, error and empty states. On phones a `CardList` of the same entries (not tappable): description or "Payment received", number · date · method, Charge / Payment badge (+ Voided), amount (payments green, voided struck through), Balance after, "Reason: …", same kebab. A payment's paperclip (own column; a "Files" fact on phone cards) shows its `documentCount` and opens `PaymentFilesDrawer`, voided payments too; muted without files and then only with `canPay`.

## VoidEntryModal.tsx
- `VoidEntryModal`: Modal with the required Reason (trimmed, max 300) and a danger "Void charge" / "Void payment" button. Errors (409 already voided) stay inside. Toast "Charge INV-... voided" with Undo for 10 seconds: re-creates the entry ("Re-entered as INV-..."), errors in a toast.

## AddChargeModal.tsx
- `AddChargeModal({ leaseId, month, onClose })`: loads the lease (usually cached), then Type (Rent, Late fee, Other) with per-type prefills (description, amount, due date = `dayInMonth(month, rentDueDay)` for Rent, else today), Description, Amount, Due date. Sends `periodMonth = month` only for Rent. When the lease starts or ends inside the month, Rent gets a "Prorated: {amount} ({d} of {n} days)" / "Full month: {rent}" choice (prorated by default when the month's due date is outside the term; then due on the later of the start and the 1st). 409 "Rent for ... already exists" shows under Type. Optional `reentry` ({ from, values }): prefilled from a voided charge (a Rent re-entry uses its due date's month), title "Re-enter charge INV-...", toast "Re-entered as INV-...".

## RecordPaymentModal.tsx
- `RecordPaymentModal({ targets, presetLeaseId, onClose })`: Tenant (searchable `Combobox` over name, unit, property and lease number; or read-only when preset) with "Balance due" help, Amount (prefilled with the balance, and checked again when a tenant fills it) with a live note (open / in full / credit), Payment date (today), Method (ACH default), Reference (hint "Transaction ID (optional)" for Venmo and Zelle), Notes. Overpayment allowed. Optional `reentry` ({ from, values }): prefilled from a voided payment with the re-entry note, title "Re-enter payment PMT-...", toast "Re-entered as PMT-...". Optional receipt (`ReceiptField`) in the same request; toast "… with receipt". Locked and not closable while sending. After an unclear reply it stays locked until the ledger has been reloaded, then offers Open ledger (`onOpenLedger`, else the lease page) and Try again / Record again anyway.
- `PaymentTarget`: one choosable lease (`leaseId`, `label`, `unitNumber`, `balance`).

## ReceiptField.tsx
- `ReceiptField({ value, onChange, errors, onErrors, disabled })`: "Attach receipt": one optional file, then its type (the API's payment categories). `ReceiptErrors`.

## UnclearPayment.tsx
- `UnclearPayment({ state })`: "We didn't get an answer..." and what the reloaded ledger says. `UnclearState`: checking, failed, missing, found.

## PaymentFilesDrawer.tsx
- `PaymentFilesDrawer({ leaseId, entry, onClose })`: one payment's files: the `DocumentsPanel` in an lg drawer (number, amount, method, date; Voided badge). Opened from the ledger.

## reenter.ts
Voids stay permanent; a re-entry is a new entry with a new number. Plain functions, so the toast's Undo works after the void modal closed.
- `reentryNote(number, notes)`: "Re-entered after an accidental void of PMT-...", plus the original notes when both fit in 1000 characters.
- `PaymentPrefill`, `ChargePrefill`: modal prefill values.
- `paymentPrefill(payment)`: payment values with the re-entry note. `prefillFromEntry(entry)`: a voided ledger row's prefill (Rent: `periodMonth` = due date's month).
- `reenterPayment(qc, voided)`, `reenterCharge(qc, voided)`: Undo; POST the same values from the void response, then `refreshAfterMoneyChange(qc)`.

## targets.ts
- `leasePaymentTarget(lease, balance)`: the one Record Payment target on the lease page.

## Tests (`npm test`)
- `proration.test.ts`: `rentProration` (start / end / both inside the month, leap February, half-cent rounding, due date in or outside the term, null cases) and `rentDescription`.
- `paymentForm.test.ts`: the request with and without a file, the default category, unclear replies, finding the payment in the ledger, receipt errors.
- `balance.test.ts`: `balanceText` (owed, zero, credit).
- `overdue.test.ts`: `balanceSplit` (rent billed early, overdue + not due, partly paid, due today, voided, credit, cap at the balance).
