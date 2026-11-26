# src/features/units

Units: the /units list, the unit page (/units/:id), the add / edit modal and delete. The list follows the sidebar property scope.

## keys.ts
- `unitKeys`: `all`, `lists` (prefix of every list), `list({ propertyId? })`, `detail(id)`.

## hooks.ts
- `useUnits({ propertyId? })`: GET /units (OWNER all, manager assigned). An unknown propertyId gives `[]`.
- `useUnit(id)`: GET /units/:id (404 when not visible). Used by the unit page.
- `useCreateUnit()`: POST /units. Adds the new unit to the cached lists at once (the next step of an Add unit chain sees it for the duplicate check), then refreshes.
- `useUpdateUnit()`: PATCH /units/:id. Refreshes units and leases (leases embed the unit number).
- `useDeleteUnit()`: DELETE /units/:id (owner, or a manager with `units.delete`). 409 while the unit has any lease (even DRAFT) or maintenance tickets; the message says which.

## stats.ts
- `UnitListRow`, `buildUnitListRows(units, activeLeases, propertyNames)`: rows with the ACTIVE lease and property name, sorted vacant / maintenance, reserved, occupied, then property name, then unit number.
- `maintenanceNote(rows)`: "Unit 4B, Maple Court" / "3 units" / "None".
- `vacantListedText(units)`: the Vacant KPI: the known listed rents summed, plus "2 not set" (null is never counted as $0).
- `unitSearchText(row)`: unit number, property, tenant names for the search box.
- `unitSummary(unit)`: unit page subtitle "1 bd / 1 ba · 750 sq ft · Floor 3 · Listed rent $1,450.00". Parts that are null (floor area, rent) are left out. `floorAreaText(floorArea)`: "1,250 sq ft", null when not set.
- `rentDiffNote(leaseRent, listedRent)`: "Current rent" card note. The other helpers (`dueState`, `dueNote`, `leaseEndsNote`, `leasePeriod`, `LeaseBadge`) live in `features/leases`. "Listed rent not set" when the unit has none.

## form.ts
- `makeUnitSchema(units, propertyName, editing)`, `unitDefaults`, `UnitFormInput`, `UnitFormOutput`, `UNIT_FIELDS`, `EDITABLE_STATUSES`: the unit form (property, number and type required; rent (0 allowed) and floor area optional).
- `unitCreateBody(v)`: POST body, optional fields only when filled. `unitChanges(v, unit)`: PATCH body, changed fields only; a cleared rent or floor area is null (null and $0 differ).

## UnitsPage.tsx
- `UnitsPage`: /units. PageHeader with "Add Unit", 4 KPIs, toolbar (search, Property select bound to the scope, status segments with counts), table with all states, add / edit modals and delete dialog. A row or card opens the unit page with `from: "units"` (Back returns with the filters and search). Desktop: Cards / Table toggle at the right end of the toolbar (`ViewToggle`, saved per page with `useListView("units", "table")`, default Table); Cards view shows the phone cards in a grid (`UnitsTable cards`) with a compact "Sort: ..." select (no column headers there).  Search, filters, sort and page live in the URL (`useClientTable` `inUrl`): `?q=&status=&sort=&page=`. With no properties (GET /properties returned []) the page shows only the header and `NoProperties` (owner: Add property via `useAddPropertyFlow`). KPIs show a Dash when loading failed. Phones (under md): search plus a "Filters" sheet with Property (all pages), the status segments and Sort by; the count and "Clear filters" leave the app-wide property alone.

## UnitsTable.tsx
- `UnitsTable`: the list DataTable (Unit with the property under it, Layout with the sq ft under it, Listed rent, Current rent, Tenant with "Ends {date}" under it, Status; Unit, Listed rent, Current rent sortable; kebab with Edit / Delete when allowed). Row click calls `onOpen`. On phones a `CardList`: "Unit 4B", property · layout, unit status, Tenant / Lease ends / Listed rent, Current rent, same kebab; the card is a button that opens the drawer. With `cards` (desktop Cards view) the same cards in a 1 / 2 / 3-column grid (`CardList grid`). A null listed rent shows "Not set"; a null floor area is left out.

## origin.ts
- `UnitOrigin`, `UnitPageState`: the router state of every link into /units/:id (`from` "units", "property" with `{ id, name }`, "lease" with `{ id, number }`, "rent-roll").
- `unitParent(state, search)`: the first crumb (Units, the property (its Units tab), "Lease LSE-…", "Rent Roll · {year}" also from the URL), the Sidebar item and whether Back goes back in history. `rentRollYear(search)`, `unitPathFromRentRoll(unitId, year)`: the yearly Rent Roll link (`?from=rent-roll&view=year&year=`). `unitName(unitNumber, propertyName)`: "Unit 4B, Maple Court".

## UnitPage.tsx
- `UnitPage`: /units/:id (replaces the unit drawer). One line on top (`BackBreadcrumb`, the ✕ and Esc do what the arrow does): "[←] {Parent} › Unit 4B, Maple Court [✕]" from `unitParent` (the property name from GET /properties/:id). Header card: door icon, name, `unitSummary`, unit status, Delete (`unit.delete`, `UnitDeleteDialog`, then back like the arrow), Edit unit (`unit.edit`, `UnitFormModal`) and Add lease (`lease.create`, no ACTIVE lease, `LeaseWizard` for this unit); tiles: Current rent / Balance / Lease ends from the ACTIVE lease, else Listed rent ("Not set") and Status. Tabs in ?tab= (`useTabParam`): Overview (lg: Current lease or "No active lease" with Add lease, then the Unit card on the left; Description on the right when there is one), Lease history (`UnitLeaseHistory`, "Add old lease" with `lease.create`) and Documents (`DocumentsPanel`, the unit's and its leases' documents and payment files; deleting needs that record's permission). Leases and tenants opened here pass `from: "unit"`, so their Back returns to this page. "Unit not found" on 404, InlineError with Retry on other errors, a skeleton while loading. Sets the page title to the name.

## UnitOverview.tsx
- `UnitCurrentLease({ lease, unit, leaseState, tenantState })`: "Current lease" card (lease number and period, Open lease) with tiles for the primary tenant (avatar, Overdue / Due today / lease badge, `ContactActions` with the phone from GET /tenants; opens the tenant page), Current rent, Balance and Lease ends.
- `UnitNoLease({ unit, onAddLease })`: "No active lease", "This unit is {status}.", Add lease.
- `UnitInfoCard({ unit, onEdit })`: Type, Bathrooms, Floor, Floor area, Listed rent ("Not set" for nulls, $0.00 for a rent of 0); "Edit unit" with `onEdit`. `UnitDescriptionCard({ description })`: soft box, nothing when empty.

## UnitLeaseHistory.tsx
- `UnitLeaseHistory({ query, leaseState, onAddOld })`: GET /leases?unitId= (old leases "Old lease", cancelled "Cancelled", the period ends on the day a lease really ended); cards on phones; a row opens the lease with `leaseState`; "Add old lease" opens `OldLeaseModal` for this unit.

## UnitFormModal.tsx
- `UnitFormModal`: add / edit modal (react-hook-form + zod, ../property-os-api/docs/frontend-handoff/rules.md Units). Blocks a duplicate unit number in the same property (trimmed, ignoring case, never the unit itself); the backend 409 "Unit {n} already exists in this property." shows under Unit number. Listed rent optional: empty is "not set", $0 is allowed, at most $99,999,999.99. Floor area optional, more than 0 when filled. Floor -2,147,483,648 to 2,147,483,647; bathrooms 0 to 2,147,483,647 (both optional). Edit: property read-only, status read-only when OCCUPIED, PATCH with only changed fields (null when rent, floor area, floor, bathrooms or description are cleared). Chain mode via `step` ("Add unit 1 of N", "Skip the rest", "Save & add next" / "Save") and `onSaved`. Mount it only while open. Rules and bodies are in `form.ts`.

## UnitDeleteDialog.tsx
- `UnitDeleteDialog`: ConfirmDialog for DELETE /units/:id with busy state and the backend's 409 shown inside; toast "Unit 4B deleted" and `onDeleted` on success.

## Tests (`npm test`)
- `origin.test.ts`: the unit page's crumb from each origin (list, property, lease, yearly Rent Roll, pasted link), the Rent Roll link and `unitName`.
- `form.test.ts`: optional rent and floor area, $0 vs not set, clearing sends null. `stats.test.ts`: `unitSummary`, `floorAreaText`, `rentDiffNote`, `vacantListedText` without a rent or floor area.
