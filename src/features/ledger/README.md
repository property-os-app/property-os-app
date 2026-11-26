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
- `receiptErrorField(message, status)`: messages that go under the receipt (file, by `isFileError`, or category).

## proration.ts
- `RentProration`, `rentProration(lease, month)`: covered dates, days, days in month, full and prorated cents (rent x days / days in month, nearest cent, integer math), and whether the month's due date is outside the term. null when the lease covers the whole month.
- `rentDescription(month, proration?)`: "Monthly Rent - October 2026", with " (prorated, Oct 14–Oct 31)" when prorated.

## overdue.ts
- `balanceSplit(entries, balance)`, `BalanceSplit`: cents of the balance that are overdue (charges due before today, UTC) and not due yet (due after today), from the ledger. Payments pay the oldest charges first, so overdue = balance − non-voided charges due today or later (never below 0); not due yet = charges due after today, up to the balance. Stands in for a backend overdue amount (BACKEND REQUEST).

## balance.ts
- `balanceText(value)`: "$1,200.00", or "Credit $150.00" when negative.

## cards.ts
- `groupCardsByMonth(cards)`, `CardMonth`: the ledger cards by `month`, newest month first, the API order inside a month (rent before that month's late fee); charged / paid / remaining per month without voided cards.
- `cardLabel(card, year?)`: "Oct rent", "Oct late fee", "Dec 2025 rent" (year only when it differs), an OTHER charge's description.
- `allocationParts(allocation, cards)`, `allocationText(allocation, cards)`: what a payment paid, "Paid: Oct rent $600.00, Nov rent $600.00 + $50.00 credit"; "Voided: paid nothing"; "Paid ahead: $50.00 credit". `allocationOf(ledger, paymentId)`.
- `creditAmount(summary)`, `balanceOrCreditText(summary)`: the credit from `summary.credit` (never the balance's sign); "Credit $50.00" or the balance.

## ledgerParam.ts
- `useLedgerParams()`: the Ledger tab's view in ?ledger= ("entries" = All entries; By month when missing; not ?view=, which the Rent Roll back link uses), `showPayment(id)` (All entries at ?payment=), `showCard(chargeId)` (By month at ?card=), `focusPayment`, `focusCard`. Replaces the URL and keeps the router state. `entryAnchor`, `cardAnchor`: element ids to scroll to.

## LedgerMonths.tsx
- `LedgerMonths({ ledger, state, empty, error, actionsFor, onShowPayment, focusCard, onOpenDeposit })`: a DEPOSIT payment's "Paid by" line reads "Deposit applied" with a "From deposit settlement" link (`onOpenDeposit`). "By month": one bordered group per month (newest first, full width) with the month and "Charged · Paid · Remaining" (voided charges skipped) in its header, then one full-width row per charge in the API order (rent, late fee, other charges), divided by thin lines. From 48rem of group width (a container query) the rows share fixed columns under a column header, like a spreadsheet: invoice number + type badge | description with "Due …" | Amount | Paid | Remaining (red when overdue) | status badge (StatusBadge rent: Paid, Partial, Unpaid, Overdue, Void) | ⋮. Narrower (phones) a row stacks: number and badges, description, Amount / Paid / Remaining with labels. Under each row a subtle line with the payments applied ("Paid by PMT-… · date · method · amount"; the number opens it in All entries) or "No payment applied yet.". VOID rows are muted and struck through with "Void: {reason}". A credit line on top when `summary.credit` > 0. The row asked for (?card=) is scrolled to and highlighted. Loading, empty and error states.

## LedgerParts.tsx
- `BalanceText({ value, overdue, caption })`: a balance number, bold when owed and danger only with `overdue` (a balance above $0 isn't late: rent is billed up to 28 days early), success "Credit {amount}" when negative; `caption` ("Due Nov 1") under it, right-aligned. The ledger's running balance passes no `overdue`, so it is never red.
- `PaidLine({ allocation, cards, onShowCard })`: a payment's "Paid: …" line; with `onShowCard` each charge is a link to its card in By month.

## LedgerView.tsx
- `LedgerView({ lease, canVoid, canCharge, canPay, onOpenDeposit })`: a DEPOSIT payment reads "Deposit applied" with a "From deposit settlement" link (`DepositSettlementLink`, opens the Deposit card) and has no Void and no Re-enter (the API refuses both; the settlement changes it). compact full-width table newest first (date, description + number, method, charge, payment, running balance). The balance cards are tiles on the lease page now. Voided rows are muted with a strikethrough, a "Voided" badge and the reason. Kebab: "Void charge / payment" on live rows (`canVoid`), "Re-enter charge / payment" on voided rows (`canCharge` / `canPay`), which opens Add charge / Record Payment prefilled. Loading, error and empty states. On phones a `CardList` of the same entries (not tappable): description or "Payment received", number · date · method, Charge / Payment badge (+ Voided), amount (payments green, voided struck through), Balance after, "Reason: …", same kebab. A payment's paperclip (own column; a "Files" fact on phone cards) shows its `documentCount` and opens `PaymentFilesDrawer`, voided payments too; muted without files and then only with `canPay`. A toggle (`SegmentedControl`, ?ledger=) switches between "By month" (`LedgerMonths`, the default) and "All entries" (this table / cards). Payments show their "Paid: …" line (`PaidLine`); the payment asked for (?payment=, from a card) is scrolled to and outlined. Card kebabs reuse the rows' Void / Re-enter.

## VoidEntryModal.tsx
- `VoidEntryModal`: Modal with the required Reason (trimmed, max 300) and a danger "Void charge" / "Void payment" button. Errors (409 already voided) stay inside. Toast "Charge INV-... voided" with Undo for 10 seconds: re-creates the entry ("Re-entered as INV-..."), errors in a toast.

## AddChargeModal.tsx
- `AddChargeModal({ leaseId, month, onClose })`: loads the lease (usually cached), then Type (Rent, Late fee, Other) with per-type prefills (description, amount, due date = `dayInMonth(month, rentDueDay)` for Rent, else today), Description, Amount, Due date. Sends `periodMonth = month` only for Rent. When the lease starts or ends inside the month, Rent gets a "Prorated: {amount} ({d} of {n} days)" / "Full month: {rent}" choice (prorated by default when the month's due date is outside the term; then due on the later of the start and the 1st). 409 "Rent for ... already exists" shows under Type. Optional `reentry` ({ from, values }): prefilled from a voided charge (a Rent re-entry uses its due date's month), title "Re-enter charge INV-...", toast "Re-entered as INV-...".

## RecordPaymentModal.tsx
- `RecordPaymentModal({ targets, presetLeaseId, onClose })`: Tenant (searchable `Combobox` over name, unit, property and lease number; or read-only when preset) with "Balance due" help, Amount (prefilled with the balance, and checked again when a tenant fills it) with a live note (open / in full / credit), Payment date (today), Method (ACH default), Reference (hint "Transaction ID (optional)" for Venmo and Zelle), Notes. Overpayment allowed. Optional `reentry` ({ from, values }): prefilled from a voided payment with the re-entry note, title "Re-enter payment PMT-...", toast "Re-entered as PMT-...". Optional receipt (`ReceiptField`) in the same request; toast "… with receipt". Locked and not closable while sending. After an unclear reply it stays locked until the ledger has been reloaded, then offers Open ledger (`onOpenLedger`, else the lease page) and Try again / Record again anyway. Under Amount: "Don't record security deposits here: they would pay rent." (a hint, never blocking).
- `PaymentTarget`: one choosable lease (`leaseId`, `label`, `unitNumber`, `balance`).

## ReceiptField.tsx
- `ReceiptField({ value, onChange, errors, onErrors, disabled })`: "Attach receipt": one optional file, then its type (the API's payment categories). `ReceiptErrors`.

## UnclearPayment.tsx
- `UnclearPayment({ state })`: "We didn't get an answer..." and what the reloaded ledger says. `UnclearState`: checking, failed, missing, found.

## PaymentFilesDrawer.tsx
- `PaymentFilesDrawer({ leaseId, entry, allocation, cards, onClose })`: one payment's files: the `DocumentsPanel` in an lg drawer (number, amount, method, date; Voided badge). Opened from the ledger. The header adds what the payment paid (`allocationText`).

## reenter.ts
Voids stay permanent; a re-entry is a new entry with a new number. Plain functions, so the toast's Undo works after the void modal closed.
- `reentryNote(number, notes)`: "Re-entered after an accidental void of PMT-...", plus the original notes when both fit in 1000 characters.
- `PaymentPrefill`, `ChargePrefill`: modal prefill values.
- `paymentPrefill(payment)`: payment values with the re-entry note. `prefillFromEntry(entry)`: a voided ledger row's prefill (Rent: `periodMonth` = due date's month); null for a DEPOSIT payment.
- `reenterPayment(qc, voided)`, `reenterCharge(qc, voided)`: Undo; POST the same values from the void response, then `refreshAfterMoneyChange(qc)`.

## targets.ts
- `leasePaymentTarget(lease, balance)`: the one Record Payment target on the lease page.

## Tests (`npm test`)
- `cards.test.ts`: grouping by month (newest first, API order inside, totals without voided cards), card labels, the "Paid: …" text (credit, voided, unknown charge) and the credit from `summary.credit`.
- `proration.test.ts`: `rentProration` (start / end / both inside the month, leap February, half-cent rounding, due date in or outside the term, null cases) and `rentDescription`.
- `paymentForm.test.ts`: the request with and without a file, the default category, unclear replies, finding the payment in the ledger, receipt errors.
- `balance.test.ts`: `balanceText` (owed, zero, credit).
- `reenter.test.ts`: a voided payment re-enters with its method; a DEPOSIT payment never does.
- `overdue.test.ts`: `balanceSplit` (rent billed early, overdue + not due, partly paid, due today, voided, credit, cap at the balance).
