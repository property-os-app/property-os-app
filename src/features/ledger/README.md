# src/features/ledger

The lease ledger, shared by the Rent Roll ledger drawer and the lease drawer's Payments tab: charges, payments, voids. Every change refreshes the rent roll, every lease query (lists, details, ledgers) and tenants.

## hooks.ts
- `refreshAfterMoneyChange(qc)`: invalidates `["rent-roll"]`, `["leases"]` and `["tenants"]`. Also used by Generate rent.
- `useLedger(leaseId)`: GET /leases/:id/ledger (key `leaseKeys.ledger(id)`).
- `useAddCharge()`: POST /leases/:id/charges. `useRecordPayment()`: POST /leases/:id/payments.
- `useVoidCharge()`, `useVoidPayment()`: POST .../void with `{ reason }` (OWNER only).

## balance.ts
- `balanceText(value)`: "$1,200.00", or "Credit $150.00" when negative.

## LedgerParts.tsx
- `BalanceText`: a balance number, danger and bold when owed, success "Credit {amount}" when negative.

## LedgerView.tsx
- `LedgerView({ leaseId, canVoid })`: 3 cards (Current balance, Monthly rent, Total paid) and a compact table newest first (date, description + number, method, charge, payment, running balance). Voided rows are muted with a strikethrough, a "Voided" badge and the reason. Kebab "Void charge / Void payment" only with `canVoid`. Loading, error and empty states.

## VoidEntryModal.tsx
- `VoidEntryModal`: Modal with the required Reason (trimmed, max 300) and a danger "Void charge" / "Void payment" button. Errors (409 already voided) stay inside. Toast "Charge INV-... voided".

## AddChargeModal.tsx
- `AddChargeModal({ leaseId, month, onClose })`: loads the lease (usually cached), then Type (Rent, Late fee, Other) with per-type prefills (description, amount, due date = `dayInMonth(month, rentDueDay)` for Rent, else today), Description, Amount, Due date. Sends `periodMonth = month` only for Rent. 409 "Rent for ... already exists" shows under Type.

## RecordPaymentModal.tsx
- `RecordPaymentModal({ targets, presetLeaseId, onClose })`: Tenant (Select, or read-only when preset) with "Balance due" help, Amount (prefilled with the balance) with a live note (open / in full / credit), Payment date (today), Method (ACH default), Reference, Notes. Overpayment allowed.
- `PaymentTarget`: one choosable lease (`leaseId`, `label`, `unitNumber`, `balance`).
