# src/features/rent-roll

The /rent-roll page: the month's rows per lease, KPIs from the summary, Generate rent. A row opens the lease page (`/leases/:id?tab=ledger&from=rent-roll&month=`). Charges, payments and the ledger itself live in `src/features/ledger`.

## keys.ts
- `rentRollKeys`: `all` (the shared `["rent-roll"]` prefix) and `month(month, propertyId)`.

## hooks.ts
- `rentRollQuery(month, propertyId)`: the GET /rent-roll query options (key + fetch), shared with the dashboard's month history.
- `useRentRoll(month, propertyId)`: GET /rent-roll with month and the scope only (status and search are filtered on the client so counts and KPIs match).
- `useGenerateRent()`: POST /rent-roll/generate { month } (all visible properties); refreshes rent roll, leases and tenants.

## stats.ts
- `monthFromParam(param)`: the ?month= value, or the current UTC month when missing or invalid.
- `isPastMonth(month)` / `isFutureMonth(month)`: before / after the current UTC month.
- `lastGeneratableMonth()`: next UTC month, the latest month POST /rent-roll/generate accepts. `canGenerateRent(month)`: true up to that month.
- `STATUS_FILTERS`, `StatusFilter`, `statusCounts(rows)`: the segments and their counts.
- `rowSearchText(row)`: lease number, unit, primary tenant (rows don't carry co-tenants).
- `owingCount(rows)`: rows with balance > 0. `rowTotals(rows)`: billed count and previous balance / rent due / paid / net balance / credits sums in cents.
- `paidCaption(row)`: "incl. {amount} toward earlier balance" or "Covered by earlier credit" (payments pay the oldest charges first).
- `statusDate(row, pastMonth)`: last payment date, "{n} days overdue" ("Unpaid at month end" in a past month), "Due {date}" or "Not billed yet".
- `rowLabel(row)`, `paymentTargets(rows)`: Record Payment choices.

## RentRollPage.tsx
- `RentRollPage`: header with the month switcher (prev, current month, next; kept in ?month=), Generate rent (disabled after next UTC month, with "You can generate rent up to {Month YYYY}." in the header and the banner) and Record Payment; 4 KPIs (Deposits held says "as of today" off the current month); status segments, search and Property (scope); banners by NOT_BILLED rows ("not generated yet" when all, "{n} leases aren't billed" with a link to the Not billed segment when some); the table (no Property column when one property is picked); a row click or "Open ledger" goes to the lease page, Ledger tab; kebab Record payment and Add charge open their modals here.

## RentRollTable.tsx
- `RentRollTable`: columns (tenant + lease number + Ended/Terminated badge, unit, property (optional), previous balance, rent due, paid + caption, balance, status, status date), kebab (Open ledger, Record payment, Add charge) and the totals row over all filtered rows ("{n} billed", sums, "after {credits} in credits").

## GenerateRentModal.tsx
- `GenerateRentModal`: "Generate rent for {Month}" confirm, with a warning for past months and next month; result toast with the created and skipped counts.
