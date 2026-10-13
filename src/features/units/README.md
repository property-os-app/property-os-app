# src/features/units

Units: the /units list, the unit drawer (also opened from the property detail page), the add / edit modal and delete. The list follows the sidebar property scope.

## keys.ts
- `unitKeys`: `all`, `lists` (prefix of every list), `list({ propertyId? })`.

## hooks.ts
- `useUnits({ propertyId? })`: GET /units (OWNER all, manager assigned). An unknown propertyId gives `[]`.
- `useCreateUnit()`: POST /units. Adds the new unit to the cached lists at once (the next step of an Add unit chain sees it for the duplicate check), then refreshes.
- `useUpdateUnit()`: PATCH /units/:id. Refreshes units and leases (leases embed the unit number).
- `useDeleteUnit()`: DELETE /units/:id (OWNER). 409 while the unit has any lease (even DRAFT) or maintenance tickets; the message says which.

## stats.ts
- `UnitListRow`, `buildUnitListRows(units, activeLeases, propertyNames)`: rows with the ACTIVE lease and property name, sorted vacant / maintenance, reserved, occupied, then property name, then unit number.
- `maintenanceNote(rows)`: "Unit 4B, Maple Court" / "3 units" / "None".
- `unitSearchText(row)`: unit number, property, tenant names for the search box.
- `unitSummary(unit)`: drawer description "1 bd / 1 ba · 750 sq ft · Floor 3 · Listed rent $1,450.00".
- `rentDiffNote(leaseRent, listedRent)`: "Current rent" card note. The other drawer helpers (`dueState`, `dueNote`, `leaseEndsNote`, `leasePeriod`, `LeaseBadge`, `StatCard`) live in `features/leases`.

## UnitsPage.tsx
- `UnitsPage`: /units. PageHeader with "Add Unit", 4 KPIs, toolbar (search, Property select bound to the scope, status segments with counts), table with all states, drawer, add / edit modals and delete dialog.

## UnitsTable.tsx
- `UnitsTable`: the list DataTable (Unit, Listed rent, Current rent sortable; kebab with Edit / Delete when allowed). Row click calls `onOpen`.

## UnitDrawer.tsx
- `UnitDrawer`: lg drawer for one unit. Tenant tab (active lease card with Overdue / Due today / lease badge, Current rent / Balance / Lease ends cards, or "No active lease" with an "Add lease" button that opens the lease wizard for this unit, with `lease.create`; Details list) and Lease history tab (GET /leases?unitId=). Footer: Delete (OWNER) and Edit unit. Closes itself after a delete.

## UnitFormModal.tsx
- `UnitFormModal`: add / edit modal (react-hook-form + zod, ../property-os-api/docs/frontend-handoff/rules.md Units). Blocks a duplicate unit number in the same property (trimmed, ignoring case, never the unit itself); the backend 409 "Unit {n} already exists in this property." shows under Unit number. Rent more than $0 and at most $99,999,999.99; floor -2,147,483,648 to 2,147,483,647; bathrooms 0 to 2,147,483,647. Edit: property read-only, status read-only when OCCUPIED, PATCH with only changed fields (null when floor, bathrooms or description are cleared). Chain mode via `step` ("Add unit 1 of N", "Skip the rest", "Save & add next" / "Save") and `onSaved`. Mount it only while open.

## UnitDeleteDialog.tsx
- `UnitDeleteDialog`: ConfirmDialog for DELETE /units/:id with busy state and the backend's 409 shown inside; toast "Unit 4B deleted" and `onDeleted` on success.
