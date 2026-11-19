# src/features/rent-roll

The /rent-roll page, in two views: Month (the month's rows per lease and KPIs from the summary) and Year (`?view=year&year=`, the client's spreadsheet rent roll from GET /rent-roll/year). Rent is billed automatically by the backend (Settings → Billing); there is no generate button. A row opens the lease page (`/leases/:id?tab=ledger&from=rent-roll&month=`). Charges, payments and the ledger itself live in `src/features/ledger`.

## keys.ts
- `rentRollKeys`: `all` (the shared `["rent-roll"]` prefix, so lease and money changes refresh both views), `month(month, propertyId)` and `year(year, propertyId)`.

## hooks.ts
- `rentRollQuery(month, propertyId)`: the GET /rent-roll query options (key + fetch), shared with the dashboard's month history.
- `useRentRoll(month, propertyId)`: GET /rent-roll with month and the scope only (status and search are filtered on the client so counts and KPIs match).
- `useRentRollYear(year, propertyId)`: GET /rent-roll/year (the yearly grid, property and grand totals); search and chips are filtered on the client.

## stats.ts
- `monthFromParam(param)`: the ?month= value, or the current UTC month when missing or invalid.
- `isPastMonth(month)` / `isFutureMonth(month)`: before / after the current UTC month.
- `STATUS_FILTERS`, `StatusFilter`, `statusCounts(rows, upcoming)`: the segments (plus UI-only `UPCOMING`) and their counts; Not billed counts only rows the automatic billing will bill.
- `BillingKind`, `billingKind(dueDate, lease)`: how the automatic billing treats a lease this month (billable, starts-late, ends-early, not-monthly), same order as the backend (no proration).
- `UpcomingRow`, `upcomingCaption(kind, lease, month)`, `upcomingRows(rows, leases, month)`: NOT_BILLED rows the automatic billing skips, with their caption ("Starts Oct 14 · first rent Nov 1", "Ended Oct 20 · no October rent due", "Pays weekly · add charges by hand").
- `rowFilterStatus(row, upcoming)`: the row's segment (UPCOMING or its status).
- `rowSearchText(row)`: lease number, unit, primary tenant (rows don't carry co-tenants).
- `owingCount(rows)`: rows with balance > 0. `rowTotals(rows)`: billed count and previous balance / rent due / paid / owed (positive balances, matches the Outstanding KPI unfiltered) / credits sums in cents.
- `paidCaption(row)`: "incl. {amount} toward earlier balance" or "Covered by earlier credit" (payments pay the oldest charges first).
- `notBilledCaption(dueDate, pastMonth, leadDays)`: when a NOT_BILLED row bills (bill date = due date − lead days): "Bills automatically on Nov 11", "Bills on the next daily run" once the date is reached, "Due Nov 25 · bills automatically before then" without lead days (managers), "Not billed · add rent by hand" in a past month.
- `statusDate(row, pastMonth, leadDays)`: last payment date, "{n} days overdue" (`daysSince`) ("Unpaid at month end" in a past month), "Due {date}" or `notBilledCaption`.
- `rowLabel(row)`, `paymentTargets(rows)`: Record Payment choices.
- `collectionBreakdown(rows)`, `CollectionBreakdown`: cents of the month's payments that went toward earlier balances (min(paid, max(opening, 0))) and that were paid in advance (max(0, paid - max(opening, 0) - charged)), over all rows.
- `collectionNote(breakdown)`: "Includes {x} toward earlier balances and {y} paid in advance" (non-zero parts only), or null.

## yearStats.ts
Pure helpers for the yearly view (GET /rent-roll/year).
- `MIN_YEAR`, `currentYearUTC()`, `yearFromParam(param)`: ?year= from 2000 to next UTC year, else the current UTC year.
- `RentRollView`, `viewSwitchParams(prev, to, period)`: the URL after Month ⇄ Year (keeps ?q=, drops the other view's filters; month → its year; year → the current month this year, else January).
- `shortMonth(month)` / `shortMonthYear(month)`: "Oct" / "Oct 2026" (headers, tooltips), no Date math.
- `CELL_STATUSES`, `cellStatusLabels`, `cellTone`: legend order, friendly labels (rent statuses from StatusBadge) and theme classes per status (`cell` for the table cell and strip square, `swatch` for the legend).
- `monthCellClass(cell)`: a cell's status classes (SpreadsheetTable `cellClassName`).
- `cellDisplay(cell, reserved?)`: what a cell shows (paid amount, "Vacant" or "Reserved", or null for a Dash). `cellDescription(cell, reserved?)`: the tooltip / screen-reader text ("Oct 2026 · Paid $1,000.00 of $2,850.00 · Balance $1,850.00 · Partial"; OVERDUE ends "Overdue · balance includes earlier months", since it is balance-based).
- `isLeaseEnded(row)`, `daysToEndText(row)`: "Ends in 52 days" / "Ends tomorrow" / "Ends today", or "Ended Nov 30, 2026" (never a negative number).
- `renewalAlertLabels`, `renewalAlertTone`, `renewalText(nextLease)`: "Ends soon" / "Ended" badges; "Renewed" / "Renewal drafted" / "Next tenant" (the backend's wording).
- `isReservedRow(row)`, `rowTitle(row)`, `shownVacantMonths(row)`: a VACANT_UNIT row whose unit is RESERVED (e.g. the owner's office) reads "Reserved" (grey badge), its cells say "Reserved", its vacant months are hidden and the Vacant chip skips it; other unit rows read "Vacant".
- `tenantNames(row)`, `yearRowKey(row)`, `yearSearchText(row)`: tenants joined, a stable row key, the texts search looks in (tenants, "Unit 4B", property, lease number, "Vacant").
- `YearChip`, `YEAR_CHIPS`, `yearChipLabels`, `chipsFromParam(param)`: the Ends soon / Unpaid months / Vacant chips kept in ?chips=.
- `hasUnpaidMonths(row)`, `hasVacancy(row)` (never a reserved row), `matchesChips(row, chips)`, `filterYearRows(rows, search, chips)`: the filters (every active chip narrows).
- `PropertyGroup`, `groupByProperty(rows, propertyTotals)`: filtered rows per property in the API's order, with that property's API totals.
- `yearLeasePath(leaseId, year, tab?)`: `/leases/:id?[tab=ledger&]from=rent-roll&view=year&year=` (the lease page links back to this year).
- `YEAR_OPTIONAL_COLUMNS`, `YearOptionalColumn`, `YEAR_OPTIONAL_KEYS`: the Columns menu choices (Market rent, Lease start, Lease end, Deposit, Late fees, Vacancy months, Days to lease end, Renewal), all hidden by default.

## yearCsv.ts
- `csvMoney(value)`, `csvText(value)`, `csvField(value)`: money as plain numbers ("3400.00"), a leading `'` on text that would run as a formula, quoting.
- `yearCsvHeader(months)`, `buildYearCsv(data)`: the whole year (search and chips ignored) in the API's order, a "Subtotal" line after each property (from `propertyTotals`) and a "Total" line (from `totals`); vacant / outside-lease months are blank.
- `yearCsvFilename(year, propertyName?)`: "Rent roll 2026.csv" or "Rent roll 2026 - {property}.csv".
- `downloadYearCsv(data, propertyName?)`: saves it with a UTF-8 BOM (Excel).

## RentRollPage.tsx
- `RentRollPage`: renders `RentRollYearView` when `?view=year`, else `RentRollMonthView` (each view owns its hooks and header).

## RentRollViewSwitch.tsx
- `RentRollViewSwitch({ view, period })`: the Month | Year `SegmentedControl` in both headers (full width on phones); switching uses `viewSwitchParams` and keeps the scroll.

## RentRollMonthView.tsx
- `RentRollMonthView`: header with the Month | Year switch, the month switcher (prev, current month, next; kept in ?month=, a new month resets the page and keeps the scroll) and Record Payment; the description says rent is billed automatically before each due date. 4 KPIs: Total collected, Outstanding balance, "Owed by overdue leases" (`summary.overdueTotal` adds the whole balances of OVERDUE rows, which can include charges due later in the month, so it isn't labelled "overdue"), Deposits held ("as of today" off the current month); status segments, search and Property (scope); loads `useLeases` in the same scope to split NOT_BILLED rows into Not billed and Upcoming (if they fail, every NOT_BILLED row counts as Not billed); loads the billing lead days for the Owner (`useBillingSettings`, Owner only; managers get the due-date caption); Upcoming segment only when such rows exist; the table (no property name under the unit when one property is picked); Desktop: Cards / Table toggle at the right end of the toolbar (`ViewToggle`, saved per page with `useListView("rent-roll", "table")`, default Table); Cards view shows the phone cards in a grid (`RentRollTable cards`) with a compact "Sort: ..." select, Totals card on top; a row click or "Open ledger" goes to the lease page, Ledger tab; kebab Record payment and Add charge ("Bill partial month" stays: the automatic billing doesn't prorate) open their modals here; Call tenant / Email reminder on OVERDUE rows in the current UTC month only (phone and email from the cached `useTenants` list, hidden while it loads or fails; CC co-tenants from the loaded leases). Email reminder fetches the lease's ledger (`ledgerQuery`, cached) and quotes the overdue amount (`balanceSplit`), not the row balance; if the ledger fails the email leaves the amount out. Search, filters, sort and page live in the URL (`useClientTable` `inUrl`): `?month=&q=&status=&sort=&page=`. "Total collected" adds the `collectionNote` line. With no properties the page shows only the header and `NoProperties`. KPIs show a Dash when loading failed. Phones (under md): the month switcher fills its own row (44px arrows), Record Payment full width under it; search plus a "Filters" sheet with Rent status, Property (all pages) and Sort by.

## RentRollYearView.tsx
- `RentRollYearView`: header with the Month | Year switch, the year picker (‹ 2026 ›, arrows limited to `availableYears`, the middle button returns to the current UTC year; a new year is a history entry) and Export CSV (secondary, disabled until loaded; tooltip "Exports the whole year for the selected property" / "…for all properties"; toast "Downloaded Rent roll 2026.csv"). Toolbar: search (?q=, tenants, unit, property, lease number; at least 240px on desktop), Property (the app-wide scope), chips Ends soon / Unpaid months / Vacant with counts (?chips=, each narrows), Columns menu (`useColumnVisibility("rent-roll-year")`, kept at the toolbar's right edge with `ml-auto` so its panel stays on screen when the toolbar wraps). Phones: search + Filters sheet (chips, Property). `YearLegend` above the list. Five states; empty year → "Go to Units", filtered empty → Clear filters. While a search or chip is on, the note "Totals include all units in scope, not just the filtered rows." shows under the table / cards. A lease row opens the lease page, Ledger tab (`yearLeasePath`, back returns to this year); a vacant row opens `YearUnitDrawer`. No KPIs and no Record Payment in this view.

## YearTable.tsx
- `YearTable`: the desktop grid on `SpreadsheetTable`: sticky "Unit · Tenants" (primary tenant "+n", or "Vacant" muted; "Unit 4B · lease number"; a button that opens the row), Current rent, optional Market rent / Lease start / Lease end / Deposit, Jan–Dec (`MonthCell`, background by status, full month name for screen readers), Total (paid; "of charged" for screen readers and tooltip), optional Late fees / Vacancy ("3 months", months in the tooltip), Renewal alert badge, optional Lease ends (`daysToEndText`) and Renewal (link to the next lease). Groups by property ("{name} · n rows") with the API subtotal row ("{name} total", paid over "of charged" per month and year, late fees); "Total {year}" from `totals`, sticky at the bottom.

## YearCards.tsx
- `YearCards`: phones (`CardList`): "Total {year}" card on top, then per property a subtotal card (paid, "of $charged charged · late fees") before its rows; a row card shows tenants or "Vacant" (muted), "Unit · lease number", the renewal alert badge, "Paid {year}" with "of $charged", and the `MonthStrip`. Tapping opens the row like the table.

## MonthCell.tsx
- `MonthCell({ cell })`: a month's paid amount ("Vacant" or a Dash for the muted kinds, an alert icon on OVERDUE); tooltip and screen-reader text from `cellDescription`.

## MonthStrip.tsx
- `MonthStrip({ cells, year })`: 12 small squares J F M … in the status colours (dot on OVERDUE), list roles, each read as the full cell text.

## YearLegend.tsx
- `YearLegend`: "Cells show the amount paid" plus one swatch + label per cell status.

## YearUnitDrawer.tsx
- `YearUnitDrawer({ unitId, unitNumber, propertyName, onClose })`: loads the unit (`useUnit`) and opens `UnitDrawer`; a placeholder drawer with skeletons (or Retry) while it loads.

## RentRollTable.tsx
- `RentRollTable`: columns (tenant + Ended/Terminated badge with "Unit 4B · property (optional) · lease number" under it, the header sorting by Tenant or Unit (`MergedSortHeader`); previous balance (two-line header), rent due, paid + caption (wraps, max 144px), balance (red only on OVERDUE rows: `BalanceText overdue`), status badge + status date caption; "Upcoming" info badge + reason for rows the automatic billing skips; Not billed rows say when they bill, from `billingLeadDays`), kebab (Open ledger, Record payment, Add charge, or "Bill partial month" on leases starting or ending inside the month, then Call tenant / Email reminder from `reminderFor`, a `RowReminder`: `tel` and `email()`, which opens the email once the overdue amount is known) and the totals row over all filtered rows ("{n} billed", sums, Balance "Owed {positive balances}" with a "Credits {credits}" caption when there are any). On phones a `CardList`: a Totals card on top ("{n} billed", Rent due, Paid, Owed, Credits caption), then one card per row (tenant, unit · property · lease number, rent status or "Upcoming" + reason, Ended/Terminated badge, Balance with the status date, Rent due / Paid / Previous balance when not 0, same kebab); red strip on OVERDUE (table rows too, `DataTable rowStrip`); the card opens the ledger. With `cards` (desktop Cards view) the same Totals card (full width) and cards in a 1 / 2 / 3-column grid (`CardList grid`).

## Tests (`npm test`)
- `yearStats.test.ts`: year param range, Month ⇄ Year URL, lease path, reserved units, overdue wording, status → tone and label, cell text and tooltip, days-to-end text (never negative), renewal text, chips, search, grouping.
- `yearCsv.test.ts`: reserved row ("Reserved", 0 vacant months), money format, formula guard, quoting, filename, row order with subtotals and total from the API, vacant and ended rows.
- `stats.test.ts`: billing kinds, Upcoming vs NOT_BILLED, segment counts, not-billed captions (bill date, next run, managers, past month), status dates (fake "now", also New York), paid caption, totals (collected = Σ paid, due = Σ charged, opening + charged − paid = balance), collection breakdown, and the UTC month helpers.
