# src/features/dashboard

The "/" home page. Every number comes from one hook, `useDashboardStats(scope)`, which follows the sidebar scope and the current UTC month. Each section (header, rent card, KPIs, tables, charts, Needs attention) loads and fails on its own. A future `GET /dashboard` endpoint should only need changes in `hooks.ts`.

## hooks.ts
- `useDashboardStats(scope)`: reads GET /properties, /units, /leases (scope), /maintenance-tickets/summary (scope, same key as the Maintenance page), /rent-roll for this month and the last 6 months (`useQueries`, same keys as the Rent Roll page, so the cache is shared). Returns `month` and one `Section` per part: `header` (`noProperties`, `description`), `rent` (rent collection), `kpis`, `atRisk`, `overdue`, `billed`, `expirations`, `unitStatus`, `attention`.
- `Section<T>`: `data` once every query it needs has loaded, `isPending`, `error`, `retry` (refetches only the failed queries).

## stats.ts
Pure functions; only `hooks.ts` calls them.
- `greeting(name)`: "Good morning / afternoon / evening, {first name}" (local hour).
- `headerDescription(...)`: owner, manager or one-property sentence.
- `shortMonth(month)` ("Oct"), `monthRange(from, count, forward?)`: month lists.
- `RentCollection`, `rentCollection(roll)`: summary money, rate (null when nothing billed), billed and paid-in-full counts, `collectedNote` (rent-roll `collectionNote`).
- `UnitCounts`, `unitCounts(units)`, `vacantNote(counts)`: counts by status and the Vacant units note.
- `atRiskLeases(leases)`: ACTIVE leases past their end or ending within 60 days (UTC today), soonest first. `expiresBadge(lease)`: "Ended n days ago" / "n days" with a danger or warning tone (local days).
- `expirationsByMonth(leases, months)`: ACTIVE leases per end month.
- `overdueRows(rows)`: OVERDUE rows, oldest unpaid first, with "{n} days overdue".
- `BilledPoint`, `billedPoint(month, roll)`: cents for the chart and the tooltip text ("Not billed" when nothing is billed).
- `maintenanceAttention(summary, now?)`: open emergencies ("1 open emergency", "Open 2h, unassigned…", → `/maintenance?priority=EMERGENCY`) and tickets past SLA (→ `/maintenance?pastSla=1`), shown before the rent and lease items.
- `AttentionItem`, `AttentionAction`, `attentionItems({ roll, leases })`: overdue ("{amount} owed by overdue leases."), past end, ending within 30 days, drafts (in that order). No "not billed" item: rent bills automatically.

## DashboardPage.tsx
- `DashboardPage`: header with the greeting and the description only (no actions), rent collection card, 4 KPI cards (router links; Overdue tenants says "{amount} owed by overdue leases"), the 8/4 grid. With no properties: only the header and `NoProperties` (owner: Add property via `useAddPropertyFlow`). When the header (properties, units) fails, or every section fails (backend down), one page-level InlineError with a Retry for all failed sections instead of one per section.

## RentCollectionCard.tsx
- `RentCollectionCard`: Total due, Collected, Outstanding (HeroStatCard), the collection bar; nothing billed: empty bar and "Nothing billed for {Month} yet. Rent bills automatically before each due date." (no button). "Open Rent Roll" is a router link. Collected shows `collectedNote` under "{n} paid in full".

## DashboardTables.tsx
- `AtRiskLeasesTable`: tenant, unit, Expires badge; row opens the lease page ("← Dashboard"). On phones flat cards in the same card, same link and state.
- `OverdueRentTable`: tenant, unit, balance + days overdue; row opens the lease page, Ledger tab. On phones flat cards (Overdue badge, red strip, Balance + days overdue), same link and state.

## NeedsAttention.tsx
- `NeedsAttention`: the rules that apply, each with a title, one line and a small router-link button (44px on phones), or "All clear".

## DashboardCharts.tsx
- `BilledCollectedChart`: last 6 months, Billed (grey) vs Collected (green), tooltips from the summary strings, table values from cents.
- `ExpirationsChart`: ACTIVE leases ending per month, next 12 months; a bar opens /leases.
- `UnitsByStatusChart`: one bar split by unit status (StatusBadge colors), legend with counts and percents; opens /units.

## Tests (`npm test`)
- `stats.test.ts`: `maintenanceAttention` (nothing, emergencies then past SLA with their links, plurals).
