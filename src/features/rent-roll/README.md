# src/features/rent-roll

The /rent-roll page: the month's rows per lease, KPIs from the summary, Generate rent, and the ledger drawer. Charges, payments and the ledger itself live in `src/features/ledger`.

## keys.ts
- `rentRollKeys`: `all` (the shared `["rent-roll"]` prefix) and `month(month, propertyId)`.

## hooks.ts
- `useRentRoll(month, propertyId)`: GET /rent-roll with month and the scope only (status and search are filtered on the client so counts and KPIs match).
- `useGenerateRent()`: POST /rent-roll/generate { month } (all visible properties); refreshes rent roll, leases and tenants.

## stats.ts
- `monthFromParam(param)`: the ?month= value, or the current UTC month when missing or invalid.
- `STATUS_FILTERS`, `StatusFilter`, `statusCounts(rows)`: the segments and their counts.
- `rowSearchText(row)`: lease number, unit, primary tenant (rows don't carry co-tenants).
- `owingCount(rows)`: rows with balance > 0. `rowTotals(rows)`: billed count and rent / paid / balance sums in cents.
- `statusDate(row)`: last payment date, "{n} days overdue", "Due {date}" or "Not billed yet".
- `rowLabel(row)`, `paymentTargets(rows)`: Record Payment choices.

## RentRollPage.tsx
- `RentRollPage`: header with the month switcher (prev, current month, next; kept in ?month=), Generate rent and Record Payment; 4 KPIs; status segments, search and Property (scope); "not generated yet" banner; the table; drawer and modals.

## RentRollTable.tsx
- `RentRollTable`: columns (tenant + lease number + Ended/Terminated badge, unit, property, rent, paid, balance, status, status date), kebab (Open ledger, Record payment, Add charge) and the totals row over all filtered rows.

## GenerateRentModal.tsx
- `GenerateRentModal`: "Generate rent for {Month}" confirm; result toast with the created and skipped counts.

## LedgerDrawer.tsx
- `LedgerDrawer`: lg drawer with avatar + tenant, "Unit {n}, {property} · Lease to {end}", the month's status; Ledger tab (`LedgerView`) and Lease tab (key values + "Open in Leases"); footer Add charge / Record Payment by permission.
