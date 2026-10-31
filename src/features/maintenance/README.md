# src/features/maintenance

Maintenance: the /maintenance page (summary KPIs, filters, Board or Table view), the ticket drawer, the Add / Edit form and the action modals (Assign, Resolve, Cancel). GET /maintenance-tickets is paginated on the server. Managers see only tickets on their assigned properties. "Add Ticket" needs `maintenance.manage` (`can(me, "ticket.manage")`); every other button comes from the ticket's `allowedActions`. Resolving with a cost also needs `expenses.record` (the cost fields are hidden without it). API: ../property-os-api/docs/frontend-handoff/API.md ("Maintenance tickets").

## keys.ts
- `maintenanceKeys`: `all`, `lists`, `list(query)`, `summary(query)`, `detail(id)`. Invalidating `all` refreshes board columns, the table, the vendor Tickets tab, the KPIs, the sidebar badge and details.

## hooks.ts
- `useTickets(query, { enabled?, keepPrevious? })`: GET /maintenance-tickets, one page; the last answer stays on screen while the next loads.
- `useTicketSummary(query)`: GET /maintenance-tickets/summary. `{}` = every ticket the user can see (the sidebar badge); with `propertyId` the scope (page KPIs, Dashboard; same key, shared cache).
- `useTicket(id, placeholder?)`: GET /maintenance-tickets/:id (404 also when out of scope), showing the card or row until it answers.
- `useCreateTicket()`, `useUpdateTicket()`, `useTicketAction()` (`{ id, action, body }` for assign / unassign / start / resolve / reopen / cancel): the writes. Each runs `refreshAfterTicketChange`; a 409 (changed by someone else) or 403 (permission just turned off) refreshes too, so the screen shows the current state.
- `refreshAfterTicketChange(qc, saved?)`: puts the saved ticket in the cache and refreshes tickets, vendors (rating, jobs, active) and expenses (a resolve with a cost records one).
- `TicketAction`: the action names and their bodies.

## ticketText.ts
- `isActive(status)`: OPEN, ASSIGNED or IN_PROGRESS. `ticketNo(t)`: "#1042".
- `locationLabel(t)`: "Unit 7D, Maple Court", "Common area, Oakridge Commons", or the property name (the unit wins over the note).
- `spanText(ms)`: "45m", "3h", "2d". `ageText(createdAt, now?)`: "Just now", "2h ago", "3d ago".
- `slaText(t, now?)`: "Past SLA by 2h" (danger, only when the server's `sla.pastSla` says so) or "Due in 3h" / "Due now" (warning) while active; null without an SLA. `slaHoursText(t)`: "SLA 4h". `SlaText`.
- `shortTimestamp(ts)`: "Oct 6" (local). `closedText(t)`: "Closed Oct 6 · $18.00". `timestampText(ts)`: "Oct 29, 2026, 10:00 AM".
- `startOfWeek(today)`: the Sunday on or before a local "YYYY-MM-DD" (US weeks), for "Resolved this week".
- `emergencyNote(e, now?)`: the Emergency KPI note: "None open" / "Open 2h, unassigned" / "Oldest open 5h · 1 unassigned".

## ticketQuery.ts
- `TicketFilters`, `initialTicketFilters`: the URL filters (`priority`, `assignee` = all / `UNASSIGNED` / vendor id, `pastSla`, and for the Table view `status`, `cancelled`). `PRIORITIES`, `TICKET_STATUSES`, `UNASSIGNED`, `TICKET_SORT_KEYS` (created, priority), `DEFAULT_TICKET_SORT` (newest), `TICKET_PAGE_SIZE` (25), `BOARD_PAGE_SIZE` (100).
- `ticketFilterValues(vendorIds?)`: allowed URL values. `activeTicketFilterCount(f, view)`: the phone "Filters" count (the board ignores status and cancelled).
- `BOARD_COLUMNS`, `BoardColumn`, `boardColumnQuery(column, input, weekStart)`: one request per column: that status, 100, `sort=priority` for the open columns; Resolved `resolvedFrom=<Sunday>`, newest first.
- `sortParam(sort)`: Created newest (default) / oldest, Priority → `sort=priority`. `tableQuery(input)`: the Table view's request (status, include cancelled, sort, page).
- `ticketSummaryQuery(scope)`: the KPI / Dashboard summary query.
- `boardCounts(open, resolved)`: Open / Assigned / In progress from the Open column's `statusCounts`, Resolved from the Resolved column's `totalItems` (its statusCounts would also apply `resolvedFrom`).

## form.ts
- `ticketSchema`, `TicketFormInput`, `TicketFormOutput`, `TicketField`, `TICKET_FIELDS`, `LOCATION_SUGGESTIONS` ("Common area", "Exterior"): rules.md "Maintenance".
- `ticketDefaults(t?, scope?)`: a new ticket starts on the scope's property, Normal.
- `createTicketBody(values)`: empty fields left out, the estimate as a number. `ticketChanges(values, t)`: only changes (null when cleared); a property change also sends the unit; never property or unit once expenses are linked; never the vendor.
- `resolutionChanges(values, t)`: a RESOLVED ticket's note and rating (the rating only with a vendor).
- `ResolveInput`, `resolveSchema`, `resolveBody(values, { canRecordCost, hasVendor })`: cost, payment method and reference only with `expenses.record` and a cost above $0; the rating only with a vendor.
- `ticketErrorField(message)`: property, unit and vendor messages to their field; others by their leading field name.

## dropRules.ts
- `dropResult(ticket, column)`: what a drop does, from the status and `allowedActions`: → In progress = start; Open → Assigned = Assign dialog; active → Resolved = Resolve dialog; Assigned → Open = unassign; Resolved → Open or Assigned = reopen (lands in Assigned with a vendor, else Open). Blocked with a reason: In progress → Open or Assigned, Resolved → In progress, anything `allowedActions` refuses ("You can't start #1042."). `DropResult`, `DropKind`.
- `dropTargets(ticket, columns)`: the columns that accept the card (the highlight). `reopenColumn(t)`: where a reopen lands.

## ticketMenu.tsx
- `TicketActionKind`, `OnTicketAction`: what a button, menu item or board drop asks the page to do ("open" opens the drawer). `TicketActionOptions`: `onSettled(ok)`, called once the action is saved (true) or failed / its dialog was closed without saving (false).
- `actionLabel(kind, t)`: "Assign vendor" / "Reassign", "Start work", "Resolve", "Reopen", "Cancel ticket", "Edit" / "Edit resolution".
- `allowedKinds(t)`: the actions `allowedActions` allows, in menu order. `ticketMenuItems(t, onAction, kinds?)`: kebab items (Cancel last, red).

## TicketParts.tsx
- `TicketMenu`: the "⋮" with the allowed actions (nothing when none). `PriorityBadge`. `TicketStatusBadges`: status plus "Past SLA". `TicketExpenseBadge`: a linked expense's approval status or "Voided".

## TicketActions.tsx
- `useTicketActions({ onOpen })`: `run(kind, ticket)` for cards, rows and the drawer: Unassign, Start, Reopen run at once (toast, or the backend message); Edit, Assign, Resolve, Cancel open their modal (over the drawer). The optional `onSettled(ok)` reports the outcome (board drops snap back on false). Render `dialogs` once.

## MaintenancePage.tsx
- `MaintenancePage`: /maintenance. Header + "Add Ticket"; KPIs from the summary for the sidebar scope (Open tickets with the change vs last week, labelled approximate; Emergency with "Open 2h, unassigned", a click filters to Emergency; Average resolution in days; Cost YTD with "$127 / mo avg" and the pending amount); toolbar (search, Property = sidebar scope, Priority, Assignee incl. Unassigned, "Open past SLA" chip with the count, Table view also Status (with counts) and Include cancelled; Clear all; Board / Table toggle saved per browser, default Board). Filters, search, sort and page in the URL; `?ticket=<id>` opens the drawer (also from expenses and the vendor drawer). Phones: Filters sheet, chip and toggle under the search.

## TicketBoard.tsx
- `TicketBoard`: four columns (Open, Assigned, In progress, Resolved this week) with counts, skeleton cards, empty text and a per-column error with Retry; over 100 in a column: "Showing 100 of N" + "View all in Table" (Table view filtered to that status). 2 columns from 768px, 4 from 1200px. Phones: one column under scrolling Tabs with the counts, no drag.
- Desktop drag and drop (the browser's built-in one, no library): while a card is dragged, the columns `dropRules` allows get a green outline (soft green under the pointer) and the others dim. A drop moves the card at once (a pending move: it leaves its old column and sits on top of the new one, counts adjusted) and runs Start / Unassign / Reopen, or opens Assign / Resolve; the card snaps back when the request fails (the backend message shows, then the columns, summary and badge refetch) or the dialog is cancelled, and stays until the columns have refetched when it saves. A drop on a column that refuses the card shows why (short toast). Cancel is never a drop; the card menu and buttons stay the keyboard way.

## TicketCard.tsx
- `TicketCard`: #, priority, kebab; title (2 lines); location; assignee avatar or a dashed "+" (opens Assign when allowed); age; "SLA 4h · Due in 1h" (red "Past SLA by 16h"); "est. $1,800.00", or "Closed Oct 6 · $18.00" when resolved (full contrast). Emergencies get a red border and left edge. With `drag` (desktop board) the card is `draggable`, faded while dragged or while its drop is pending; a click never fires after a drag, so clicking still opens the drawer. `TicketCardSkeleton`.

## TicketsTable.tsx
- `TicketsTable`: Table view (Title with "#1042 · location" under it, Priority / status (stacked; sorts by priority), Assignee, Age / SLA (sorts by created date, newest / oldest; the date on hover), Cost (actual, else "est."), kebab; sorting on the server). Phones: `ListCard`s.

## TicketDrawer.tsx
- `TicketDrawer({ id, placeholder?, onAction, onClose })`: lg drawer: details (property, unit / note, SLA with the due time, assignee + trade, description), Costs (estimated, actual, linked expenses with their status; each opens `/expenses?expense=…`), History (`TimelineItem`s: created, assigned, started, resolved with stars and note, cancelled with the reason). Footer from `allowedActions`: the main action for the status (Assign / Start / Resolve / Reopen), a few buttons, the rest in a "⋮". 404: "Ticket not found".

## AssignModal.tsx
- `AssignModal({ ticket, onSaved?, onClose })`: Assign / Reassign: active vendors except the current one ("· Plumbing", "(insurance expired)"); the move it causes; errors inside.
- `ExpiredInsuranceNote({ vendor })`: amber "insurance expired … you can still assign them" (also on the Add form).

## ResolveModal.tsx
- `ResolveModal({ ticket, onSaved?, onClose })`: note; actual cost (only with `expenses.record`) with the expense it records (Owner: approved; manager: "goes to the owner for approval"), payment method and reference once there is a cost; vendor rating (`RatingInput`) only with a vendor. Errors under their field or at the top.

## TicketFormModal.tsx
- `TicketFormModal({ ticket?, onSaved?, onClose })`: Add (title, description, property, unit of that property, location note with suggestions, priority, vendor → starts Assigned, estimated cost) or Edit an active ticket (no vendor; property and unit locked once expenses are linked); a RESOLVED ticket edits only its resolution note and rating. "Discard changes?" on close.

## Tests (`npm test`)
- `dropRules.test.ts`: every drop (start, assign, resolve, unassign, reopen landing), the blocked ones and their messages, targets.
- `ticketText.test.ts`: number, active, location label, spans and age, SLA text (server flag only), closed line, Sunday week start, emergency note.
- `ticketQuery.test.ts`: board column queries (priority sort, resolved this week, shared filters, unassigned, table-only filters ignored), sort mapping, table query, summary query, column counts, filter count.
- `form.test.ts`: defaults, create body, title rules, changes (cleared, cents, property + unit, locked with expenses), resolved edit, error routing, resolve body (cost only with the key and > $0, rating only with a vendor).
