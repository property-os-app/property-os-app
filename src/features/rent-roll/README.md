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
- `STATUS_FILTERS`, `StatusFilter`, `statusCounts(rows, upcoming)`: the segments (plus UI-only `UPCOMING`) and their counts; Not billed counts only rows Generate rent would bill.
- `BillingKind`, `billingKind(dueDate, lease)`: how Generate rent treats a lease this month (generatable, starts-late, ends-early, not-monthly), same order as the backend.
- `UpcomingRow`, `upcomingCaption(kind, lease, month)`, `upcomingRows(rows, leases, month)`: NOT_BILLED rows that generate skips, with their caption ("Starts Oct 14 · first rent Nov 1", "Ended Oct 20 · no October rent due", "Pays weekly · add charges by hand").
- `rowFilterStatus(row, upcoming)`: the row's segment (UPCOMING or its status).
- `SkippedLease`, `skippedLeases(leases, month)`: ACTIVE leases overlapping the month that generate skips, with a reason, for the toast.
- `rowSearchText(row)`: lease number, unit, primary tenant (rows don't carry co-tenants).
- `owingCount(rows)`: rows with balance > 0. `rowTotals(rows)`: billed count and previous balance / rent due / paid / owed (positive balances, matches the Outstanding KPI unfiltered) / credits sums in cents.
- `paidCaption(row)`: "incl. {amount} toward earlier balance" or "Covered by earlier credit" (payments pay the oldest charges first).
- `statusDate(row, pastMonth)`: last payment date, "{n} days overdue" (`daysSince`) ("Unpaid at month end" in a past month), "Due {date}" or "Not billed yet".
- `rowLabel(row)`, `paymentTargets(rows)`: Record Payment choices.
- `collectionBreakdown(rows)`, `CollectionBreakdown`: cents of the month's payments that went toward earlier balances (min(paid, max(opening, 0))) and that were paid in advance (max(0, paid - max(opening, 0) - charged)), over all rows.
- `collectionNote(breakdown)`: "Includes {x} toward earlier balances and {y} paid in advance" (non-zero parts only), or null.

## RentRollPage.tsx
- `RentRollPage`: header with the month switcher (prev, current month, next; kept in ?month=, a new month resets the page and keeps the scroll), Generate rent (disabled after next UTC month, with "You can generate rent up to {Month YYYY}." in the header and the banner) and Record Payment; 4 KPIs (Deposits held says "as of today" off the current month); status segments, search and Property (scope); loads `useLeases` in the same scope to split NOT_BILLED rows into billable and Upcoming (nothing shown until they load; if they fail, every NOT_BILLED row counts as billable); one banner only when there are billable rows ("hasn't been generated yet" when nothing is billed, else "{n} leases can be billed" with a link to the Not billed segment); the header Generate rent is disabled with "Nothing left to bill for [{Property} in] {Month}" when nothing is billable; Upcoming segment only when such rows exist; the table (no property name under the unit when one property is picked); Desktop: Cards / Table toggle at the right end of the toolbar (`ViewToggle`, saved per page with `useListView("rent-roll", "table")`, default Table); Cards view shows the phone cards in a grid (`RentRollTable cards`) with a compact "Sort: ..." select (no column headers there), Totals card on top; a row click or "Open ledger" goes to the lease page, Ledger tab; kebab Record payment and Add charge open their modals here; Call tenant / Email reminder on OVERDUE rows in the current UTC month only (`reminderFor`: phone and email from the cached `useTenants` list, hidden while it loads or fails; CC co-tenants from the loaded leases). Search, filters, sort and page live in the URL (`useClientTable` `inUrl`): `?month=&q=&status=&sort=&page=`. "Total collected" adds the `collectionNote` line. With no properties (GET /properties returned []) the page shows only the header (no banner, Generate or Record Payment) and `NoProperties` (owner: Add property via `useAddPropertyFlow`). KPIs show a Dash when loading failed. Phones (under md): the month switcher fills its own row (44px arrows), Generate rent and Record Payment side by side under it, the banner's Generate rent is full width; search plus a "Filters" sheet with Rent status, Property (all pages) and Sort by (the count and "Clear filters" leave the app-wide property alone).

## RentRollTable.tsx
- `RentRollTable`: columns (tenant + lease number + Ended/Terminated badge, unit + property name caption (optional), previous balance, rent due, paid + caption, balance, status badge + status date caption; "Upcoming" info badge + reason for rows generate skips), kebab (Open ledger, Record payment, Add charge, or "Bill partial month" on leases starting or ending inside the month, then Call tenant / Email reminder from `reminderFor`) and the totals row over all filtered rows ("{n} billed", sums, Balance "Owed {positive balances}" with a "Credits {credits}" caption when there are any). On phones a `CardList`: a Totals card on top ("{n} billed", Rent due, Paid, Owed, Credits caption), then one card per row (tenant, unit · property · lease number, rent status or "Upcoming" + reason, Ended/Terminated badge, Balance with the status date, Rent due / Paid / Previous balance when not 0, same kebab); red strip on OVERDUE (table rows too, `DataTable rowStrip`); the card opens the ledger. With `cards` (desktop Cards view) the same Totals card (full width) and cards in a 1 / 2 / 3-column grid (`CardList grid`).

## GenerateRentModal.tsx
- `GenerateRentModal`: "Generate rent for {Month}" confirm, with a warning for past months and next month; result toast: "{n} rent charges created" or "Nothing new to bill for {Month}", "{n} already billed", and the leases skipped as outside the term or not monthly by name (max 3, then "+{n} more"; names come from all visible ACTIVE leases, counts when they aren't loaded).
