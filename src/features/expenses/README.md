# src/features/expenses

Expenses: the /expenses page (summary KPIs, filters, the paginated list with a "Total, filtered" row, "By category"), the expense drawer with the approval actions, and the add / edit modal. GET /expenses is paginated on the server. Managers see only expenses on their assigned properties; portfolio-wide expenses (no property) are Owner only. "Add Expense" needs `expenses.record`; every other button comes from the expense's `allowedActions`. API: ../property-os-api/docs/frontend-handoff/API.md ("Expenses").

## keys.ts
- `expenseKeys`: `all`, `lists`, `list(query)`, `summary(query)`, `detail(id)`, `categories` (outside `all`).

## hooks.ts
- `useExpenses(query, { enabled? })`: GET /expenses, one page; the last page stays on screen while the next loads (`isPlaceholderData`).
- `useExpenseSummary(query)`: GET /expenses/summary (KPIs and "By category").
- `useExpense(id, placeholder?)`: GET /expenses/:id (404 also when out of scope).
- `useExpenseCategories()`: GET /expenses/categories, kept 1 hour. `useCategoryLabel()`: key → label (the key until loaded).
- `useCreateExpense()`, `useUpdateExpense()`, `useExpenseAction()` (`{ id, action: approve | reject | void, reason? }`), `useDeleteExpense()`: the writes. Each puts the saved expense in the cache and refreshes every expense query (lists, summaries, vendor lists) and vendors (`expenseCount`). A 409 (already approved, changed at the same time) refreshes the same, so the screen shows the current state. `ExpenseAction`.

## dateRange.ts
- `RangePreset`, `RANGE_PRESETS`, `rangePresetLabels`: Year to date, This month, Last month, This quarter, Last 12 months, Last year, Custom range.
- `presetRange(preset, today)`: from / to for the local today. `resolveRange(preset, from, to, today)`: the preset's, or the custom dates (swapped when reversed; year to date when one is missing).
- `rangeLabel(preset, range)`: "year to date", "Oct 1 – Oct 28, 2026". `monthsInRange(range)`: calendar months, both ends counted. `DateRange`.

## expenseQuery.ts
- `ExpenseFilters`, `initialExpenseFilters`: the URL filters (`portfolio`, `category`, `vendor`, `status`, `range`, `from`, `to`, `voided`). `EXPENSE_STATUSES`, `EXPENSE_SORT_KEYS`, `DEFAULT_EXPENSE_SORT` (date, newest first), `EXPENSE_PAGE_SIZE` (25).
- `expenseFilterValues({ isOwner, categories, vendors })`: allowed URL values (Portfolio-wide only for the Owner).
- `activeExpenseFilterCount(f)`: the phone "Filters" count (the custom range counts once).
- `expenseRange(f, today)`, `isPortfolioOnly(f, isOwner)`.
- `expenseQuery(input)`: GET /expenses query: always from / to; "Portfolio-wide only" → `allProperties=true` and never `propertyId`; otherwise the sidebar scope as `propertyId`; defaults left out.
- `expenseSummaryQuery(input)`: the range and property only (other filters don't change the KPIs). The summary has no portfolio-only option, so "Portfolio-wide only" leaves out `propertyId`.

## expenseText.ts
- `PORTFOLIO_WIDE`: "Portfolio-wide" (an expense with no property). `propertyText(e)`, `propertyLine(e)`: "Maple Court · Unit 4B".
- `isAutoApproved(e)`: approved by its creator (the Owner's own expenses are approved on creation).

## form.ts
- `expenseSchema`, `ExpenseFormInput`, `ExpenseFormOutput`, `ExpenseField`, `EXPENSE_FIELDS`, `PORTFOLIO` (the Property select's portfolio-wide value): rules.md "Expenses".
- `expenseDefaults(expense?, scope?)`: a new one starts today, on the scope's property.
- `createExpenseBody(values)`: no `propertyId` for portfolio-wide, the amount as a number. `expenseChanges(values, expense)`: only changes (null when cleared); a category change also sends `type`, a property change also sends `unitId`.
- `expenseErrorField(message)`: property, unit and vendor messages (403 / 400 / 404 / 409) to their field; others by their leading field name.

## ExpenseParts.tsx
- `ExpenseStatusBadges`: `StatusBadge domain="approval"` plus "Voided". `ExpenseAmount`: struck through when voided.

## ExpensesPage.tsx
- `ExpensesPage`: /expenses. Header + "Add Expense"; KPIs from the summary (Total for the range with the % vs the same period last year ("–" when null), Largest category, Average monthly over N months, Pending approvals: count, amount, a click filters to pending); toolbar (search, Property = sidebar scope + "Portfolio-wide only" for the Owner, Category, Vendor (archived marked), Status, Date range (+ From / To for Custom), "Pending approval" chip, Include voided, Clear all, then Sort in Cards view and the Cards / Table toggle, saved with `useListView("expenses", "table")`); the list beside "By category" from xl (under it below xl). Everything in the URL (`useServerTable`): `?q=&portfolio=&category=&vendor=&status=&range=&from=&to=&voided=&sort=&page=`, plus `?expense=<id>` for the open drawer. A page past the end goes to the last page. Phones: search, the "Filters" sheet, the Pending chip, the list cards.

## ExpensesTable.tsx
- `ExpensesTable`: DataTable (Date, Description + number · type, Property ("Portfolio-wide") + unit, Category, Vendor, Amount, Status; Date and Amount sort on the server) with the sticky "Total, filtered" row (`totals.approvedAmount`) and "+ $X pending (n)". Cards (phones, desktop Cards view in a grid): `ListCard`s with the totals in a summary card. Voided rows muted and struck through; dimmed while the next page loads.

## CategoryBreakdown.tsx
- `CategoryBreakdown`: "By category" card for the range: `HBarList` (stacked) with label, amount and %, largest first; loading, empty and error states.

## ExpenseDrawer.tsx
- `ExpenseDrawer({ id, placeholder?, onClose })`: lg drawer: amount (struck through when voided), notes (a manager's own pending one: "Pending approval – waiting for the owner"; rejected with the reason and "edit to resubmit"; voided with the reason), details, history (recorded by; "Approved automatically (Owner)" or approved by; rejected by + reason; voided by + reason; waiting). Footer only from `allowedActions`: Delete, Void, Edit, Reject, Approve. "Expense not found" on 404.

## ExpenseFormModal.tsx
- `ExpenseFormModal({ expense?, onSaved?, onClose })`: add / edit modal. Type follows the category's default until picked by hand; Unit lists the chosen property's units and clears with the property; Vendor lists active vendors (plus the expense's own archived one); "Portfolio-wide (no single property)" only for the Owner. A manager's rejected expense shows the reason and saves as "Save and resubmit" (even with no changes). Toasts say recorded / sent for approval / resubmitted.

## ReasonModal.tsx
- `ReasonModal`: the required reason (1–300) for Reject and Void (danger); errors stay inside.

## ExpenseDeleteDialog.tsx
- `ExpenseDeleteDialog({ expense, onClose, onDeleted? })`: "Delete expense?" for a never-approved expense; the backend's 403 / 409 inside.

## Tests (`npm test`)
- `dateRange.test.ts`: every preset, January, quarter edges, leap years, custom ranges (swapped, missing), labels, month count.
- `expenseQuery.test.ts`: defaults (year to date), scope, Portfolio-wide only (Owner vs manager), search / filters / voided / sort / page, custom range, summary query, filter count.
- `form.test.ts`: create body (portfolio-wide, number amount), changes (empty, category + type, property + unit, cleared fields, money in cents), error routing.
