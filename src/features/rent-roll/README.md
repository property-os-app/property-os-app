# src/features/rent-roll

The /rent-roll page, in two views: Month (the month's rows per lease and KPIs from the summary) and Year (`?view=year&year=`, the client's spreadsheet rent roll from GET /rent-roll/year?rows=unit: one row per unit). Rent is billed automatically by the backend (Settings → Billing); there is no generate button. A row opens the lease page (`/leases/:id?tab=ledger&from=rent-roll&month=`). Charges, payments and the ledger itself live in `src/features/ledger`.

## keys.ts
- `rentRollKeys`: `all` (the shared `["rent-roll"]` prefix, so lease and money changes refresh both views), `month(month, propertyId)` and `year(year, propertyId)`.

## hooks.ts
- `rentRollQuery(month, propertyId)`: the GET /rent-roll query options (key + fetch), shared with the dashboard's month history.
- `useRentRoll(month, propertyId)`: GET /rent-roll with month and the scope only (status and search are filtered on the client so counts and KPIs match).
- `useRentRollYear(year, propertyId)`: GET /rent-roll/year with `rows=unit` (one row per unit, its leases merged month by month; property and grand totals); search and chips are filtered on the client.

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
Pure helpers for the yearly view (GET /rent-roll/year, one row per unit).
- `MIN_YEAR`, `currentYearUTC()`, `yearFromParam(param)`: ?year= from 2000 to next UTC year, else the current UTC year.
- `RentRollView`, `viewSwitchParams(prev, to, period)`: the URL after Month ⇄ Year (keeps ?q=, drops the other view's filters; month → its year; year → the current month this year, else January).
- `shortMonth(month)` / `shortMonthYear(month)`: "Oct" / "Oct 2026" (headers, tooltips), no Date math.
- `CELL_STATUSES`, `cellStatusLabels`, `cellTone`: legend order (problems first), friendly labels (rent statuses from StatusBadge) and theme classes per status (`cell` for the table cell and strip square, `swatch` for the legend). Problems stand out: OVERDUE strongest (red tint, red bold text, left marker), UNPAID red, PARTIAL amber; PAID calm (a very light success tint, normal text); NOT_BILLED neutral; FUTURE empty; VACANT light stripes.
- `VACANT_STRIPES`, `RESERVED_STRIPES`, `reservedTone`, `toneOf(cell, reserved?)`: diagonal stripes from theme tokens (`repeating-linear-gradient`); a reserved unit's months use another neutral shade and direction.
- `monthCellClass(cell, reserved?)`: a cell's classes (SpreadsheetTable `cellClassName`).
- `cellDisplay(cell)`: what a cell shows: the paid amount in short money ("$2,000", "$2,150.50"), "" for vacant / reserved (stripes) and unpaid future months, or null for a Dash (outside a lease, not billed). `cellDescription(cell, { reserved, tenants })`: the tooltip / screen-reader text with exact amounts and the month's tenant ("Mar 2026 · John Smith · Paid $2,000.00 of $2,000.00 · Paid"; two leases "John Smith → Sarah Lee"; OVERDUE ends "Overdue · balance includes earlier months"; "Vacant" / "Reserved" / "No lease this month").
- `isCurrentMonth(month)`, `isQuarterEnd(index)`: the "Now" column (current UTC month) and the thin lines after Mar, Jun, Sep.
- `leaseTenantLabel(lease, withCount?)`: the primary tenant ("+n" co-tenants with `withCount`).
- `cellTenants(row, cell)`: who a month belongs to, from `leaseIds` via `leases` ("John Smith → Sarah Lee").
- `cellLeaseTarget(row, cell)`: the lease a month cell opens (its `leaseId` when that isn't the row's current lease), else null (the row opens).
- `monthRange(months)`: "Jan–Apr" / "Mar". `otherLeases(row)`: the unit's other leases split into `earlier` / `later` around the current one (empty `monthsCovered` left out: only owing from an earlier year). `tenantsWithMonths(leases)`: "John Smith (Jan–Apr), Sarah Lee (Apr–Jun)". `otherTenantsText(row)`: the tenant cell's muted line "Earlier: …" (plus "Later: …" if a lease starts after the current one).
- `isLeaseEnded(row)`, `daysToEndText(row)`: "Ends in 52 days" / "Ends tomorrow" / "Ends today", or "Ended Nov 30, 2026" (never a negative number).
- `renewalAlertLabels`, `renewalAlertTone`, `renewalText(nextLease)`: "Ends soon" / "Ended" badges; "Renewed" / "Renewal drafted" / "Next tenant" (the backend's wording).
- `isReservedRow(row)`, `rowTitle(row)`, `shownVacantMonths(row)`: a VACANT_UNIT row whose unit is RESERVED (e.g. the owner's office) reads "Reserved" (grey badge), its cells say "Reserved", its vacant months are hidden and the Vacant chip skips it; other unit rows read "Vacant".
- `tenantNames(row)`, `yearRowKey(row)`, `yearSearchText(row)`: the current lease's tenants joined, the row key (the unit), the texts search looks in (every tenant and lease number of the unit's year, earlier ones too; "Unit 4B"; property; "Vacant" / "Reserved").
- `YearChip`, `YEAR_CHIPS`, `yearChipLabels`, `chipsFromParam(param)`: the Ends soon / Unpaid months / Vacant chips kept in ?chips=.
- `hasUnpaidMonths(row)`, `hasVacancy(row)` (a VACANT_UNIT row or any VACANT month; never a reserved row), `matchesChips(row, chips)`, `filterYearRows(rows, search, chips)`: the filters (every active chip narrows).
- `PropertyGroup`, `groupByProperty(rows, propertyTotals)`: filtered rows per property in the API's order, with that property's API totals.
- `yearLeasePath(leaseId, year, tab?)`: `/leases/:id?[tab=ledger&]from=rent-roll&view=year&year=` (the lease page links back to this year).
- `collectedPercent(paid, charged)` (one decimal, integer cents; null when nothing charged), `collectedLabel(pct)` ("97%", rounded down below 100), `collectedTone(pct)` (100%+ success, 90%+ warning, else danger): the Collected column and KPI.
- `yearSummary(rows)`: vacant unit-months (not reserved), leases ending soon, units with unpaid months, over every row in scope.
- `YEAR_OPTIONAL_COLUMNS`, `YearOptionalColumn`, `YEAR_OPTIONAL_KEYS`: the Columns menu choices (Market rent, Lease start, Lease end, Deposit, Late fees, Vacancy months, Days to lease end, Renewal), all hidden by default.

## yearCsv.ts
- `csvMoney(value)`, `csvText(value)`, `csvField(value)`: money as plain numbers ("3400.00"), a leading `'` on text that would run as a formula, quoting.
- `yearCsvHeader(months)`, `buildYearCsv(data)`: the whole year (search and chips ignored), one line per unit in the API's order (with an "Earlier tenants" column: "John Smith (Jan–Apr)"), a "Subtotal" line after each property (from `propertyTotals`) and a "Total" line (from `totals`); vacant / outside-lease months are blank.
- `yearCsvFilename(year, propertyName?)`: "Rent roll 2026.csv" or "Rent roll 2026 - {property}.csv".
- `downloadYearCsv(data, propertyName?)`: saves it with a UTF-8 BOM (Excel).

## RentRollPage.tsx
- `RentRollPage`: renders `RentRollYearView` when `?view=year`, else `RentRollMonthView` (each view owns its hooks and header).

## RentRollViewSwitch.tsx
- `RentRollViewSwitch({ view, period })`: the Month | Year `SegmentedControl` in both headers (full width on phones); switching uses `viewSwitchParams` and keeps the scroll.

## RentRollMonthView.tsx
- `RentRollMonthView`: header with the Month | Year switch, the month switcher (prev, current month, next; kept in ?month=, a new month resets the page and keeps the scroll) and Record Payment; the description says rent is billed automatically before each due date. 4 KPIs: Total collected, Outstanding balance, "Owed by overdue leases" (`summary.overdueTotal` adds the whole balances of OVERDUE rows, which can include charges due later in the month, so it isn't labelled "overdue"), Deposits held ("as of today" off the current month); status segments, search and Property (scope); loads `useLeases` in the same scope to split NOT_BILLED rows into Not billed and Upcoming (if they fail, every NOT_BILLED row counts as Not billed); loads the billing lead days for the Owner (`useBillingSettings`, Owner only; managers get the due-date caption); Upcoming segment only when such rows exist; the table (no property name under the unit when one property is picked); Desktop: Cards / Table toggle at the right end of the toolbar (`ViewToggle`, saved per page with `useListView("rent-roll", "table")`, default Table); Cards view shows the phone cards in a grid (`RentRollTable cards`) with a compact "Sort: ..." select, Totals card on top; a row click or "Open ledger" goes to the lease page, Ledger tab; kebab Record payment and Add charge ("Bill partial month" stays: the automatic billing doesn't prorate) open their modals here; Call tenant / Email reminder on OVERDUE rows in the current UTC month only (phone and email from the cached `useTenants` list, hidden while it loads or fails; CC co-tenants from the loaded leases). Email reminder fetches the lease's ledger (`ledgerQuery`, cached) and quotes the overdue amount (`balanceSplit`), not the row balance; if the ledger fails the email leaves the amount out. Search, filters, sort and page live in the URL (`useClientTable` `inUrl`): `?month=&q=&status=&sort=&page=`. "Total collected" adds the `collectionNote` line. With no properties the page shows only the header and `NoProperties`. KPIs show a Dash when loading failed. Phones (under md): the month switcher fills its own row (44px arrows), Record Payment full width under it; search plus a "Filters" sheet with Rent status, Property (all pages) and Sort by.

## RentRollYearView.tsx
- `RentRollYearView`: header with the Month | Year switch, the year picker (‹ 2026 ›, arrows limited to `availableYears`, the middle button returns to the current UTC year; a new year is a history entry) and Export CSV (secondary, disabled until loaded; tooltip "Exports the whole year for the selected property" / "…for all properties"; toast "Downloaded Rent roll 2026.csv"). Toolbar: search (?q=, tenants, unit, property, lease number; at least 240px on desktop), Property (the app-wide scope), chips Ends soon / Unpaid months / Vacant with counts (?chips=, each narrows), Columns menu (`useColumnVisibility("rent-roll-year")`, kept at the toolbar's right edge with `ml-auto` so its panel stays on screen when the toolbar wraps). Phones: search + Filters sheet (chips, Property). `YearSummary` and `YearLegend` above the list; a summary card turns on its chip. Five states; empty year → "Go to Units", filtered empty → Clear filters. While a search or chip is on, the note "Totals include all units in scope, not just the filtered rows." shows under the table / cards. A row opens its current lease, Ledger tab (`yearLeasePath`, back returns to this year); a month of an earlier lease opens that lease; a vacant or reserved unit opens `YearUnitDrawer`. No Record Payment in this view.

## YearTable.tsx
- `YearTable`: the desktop grid on `SpreadsheetTable`, one row per unit: sticky "Unit · Tenants" (the current lease's primary tenant "+n", or "Vacant" muted / grey "Reserved" badge; "Unit 4B · lease number"; a muted "Earlier: John Smith (Jan–Apr)" line; a button that opens the row), Current rent, optional Market rent / Lease start / Lease end / Deposit, Jan–Dec (`MonthCell` in short money, colour by status, the current month tagged "Now" with a soft info outline down the column, thin lines after Mar / Jun / Sep), Total paid (pinned right while the months scroll; exact amounts in the tooltip and for screen readers), optional Late fees / Vacancy, Renewal alert badge, optional Lease ends and Renewal (link to the next lease), Collected (% with a tiny bar; a Dash when nothing charged). Property bands: name, unit count and "Collected $X of $Y · Z%" from `propertyTotals`; the API subtotal row ("{name} total", paid over "of charged"); "Total {year}" from `totals`, sticky at the bottom. Rent, dates and renewal columns are the current lease's.

## YearCards.tsx
- `YearCards`: phones (`CardList`): "Total {year}" card on top, then per property a subtotal card (short money: paid, "of $charged · late fees") before its units; a unit card shows the current primary tenant "+n" or "Vacant" (muted) / "Reserved" badge, "Unit · lease number", the renewal alert badge, "Paid {year}" with "of $charged", the "Earlier: …" line and the `MonthStrip`. Tapping opens the current lease (or the Unit drawer).

## YearSummary.tsx
- `YearSummary({ data, year, isError, onShow })`: the `KpiRow` above the grid (2 columns on phones): Collected in {year} (`totals.totalPaid`, "of $charged", the %), Vacant unit-months, Leases ending soon, Units with unpaid months (counts over every unit in scope); the count cards turn on their chip.

## MonthCell.tsx
- `MonthCell({ cell, reserved, tenants, openLease })`: a month's paid amount in short money (stripes and no text for vacant / reserved, empty for unpaid future months, a Dash outside a lease, an alert icon on OVERDUE); tooltip and screen-reader text from `cellDescription`. With `openLease` (a month of another lease than the row's current one) it is a real button (dotted underline) that opens that lease without triggering the row.

## MonthStrip.tsx
- `MonthStrip({ row, year })`: 12 small squares J F M … with the desktop's colour rules and stripes (dot on OVERDUE), list roles, each read as the full cell text with the month's tenant.

## YearLegend.tsx
- `YearLegend`: "Cells show the amount paid" plus one swatch + label per cell status (problems first) and Reserved.

## YearUnitDrawer.tsx
- `YearUnitDrawer({ unitId, unitNumber, propertyName, onClose })`: loads the unit (`useUnit`) and opens `UnitDrawer`; a placeholder drawer with skeletons (or Retry) while it loads.

## RentRollTable.tsx
- `RentRollTable`: columns (tenant + Ended/Terminated badge with "Unit 4B · property (optional) · lease number" under it, the header sorting by Tenant or Unit (`MergedSortHeader`); previous balance (two-line header), rent due, paid + caption (wraps, max 144px), balance (red only on OVERDUE rows: `BalanceText overdue`), status badge + status date caption; "Upcoming" info badge + reason for rows the automatic billing skips; Not billed rows say when they bill, from `billingLeadDays`), kebab (Open ledger, Record payment, Add charge, or "Bill partial month" on leases starting or ending inside the month, then Call tenant / Email reminder from `reminderFor`, a `RowReminder`: `tel` and `email()`, which opens the email once the overdue amount is known) and the totals row over all filtered rows ("{n} billed", sums, Balance "Owed {positive balances}" with a "Credits {credits}" caption when there are any). On phones a `CardList`: a Totals card on top ("{n} billed", Rent due, Paid, Owed, Credits caption), then one card per row (tenant, unit · property · lease number, rent status or "Upcoming" + reason, Ended/Terminated badge, Balance with the status date, Rent due / Paid / Previous balance when not 0, same kebab); red strip on OVERDUE (table rows too, `DataTable rowStrip`); the card opens the ledger. With `cards` (desktop Cards view) the same Totals card (full width) and cards in a 1 / 2 / 3-column grid (`CardList grid`).

## Tests (`npm test`)
- `yearStats.test.ts`: year param range, Month ⇄ Year URL, lease path, reserved units (stripes, "Reserved"), overdue wording, status → tone and label, short cell money, tooltip with tenant names (one lease and two in a month), which lease a cell opens, earlier tenants text (empty monthsCovered skipped), Collected % / label / tone, summary counts, days-to-end text (never negative), renewal text, chips, search (earlier tenants too), grouping, unit row keys.
- `yearCsv.test.ts`: the Earlier tenants column, reserved row ("Reserved", 0 vacant months), money format, formula guard, quoting, filename, row order with subtotals and total from the API, vacant and ended rows.
- `stats.test.ts`: billing kinds, Upcoming vs NOT_BILLED, segment counts, not-billed captions (bill date, next run, managers, past month), status dates (fake "now", also New York), paid caption, totals (collected = Σ paid, due = Σ charged, opening + charged − paid = balance), collection breakdown, and the UTC month helpers.
