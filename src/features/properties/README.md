# src/features/properties

Properties: the list page (Cards / Table), the detail page, the add / edit modal and manager assignment. Properties ignore the sidebar property scope on purpose (only Units, Leases and Rent Roll use it).

## keys.ts
- `propertyKeys`: `all`, `list`, `detail(id)`, `managers(id)` (managers sit under the detail key).
- `managerKeys`: `all` (GET /managers, and the prefix of every manager query), `access(userId)` (GET /managers/:userId/access, used by Settings).

## hooks.ts
- `useProperties()`: GET /properties (OWNER all, manager assigned); each property has `unitCount` and `managers` ({ id, name }). Also used by the scope picker.
- `useProperty(id)`: GET /properties/:id (404 = missing or not visible).
- `usePropertyManagers(id)`: GET /properties/:id/managers, with emails (only the Managers card uses it).
- `useManagers()`: GET /managers, only runs for OWNER.
- `useCreateProperty()`, `useUpdateProperty()`, `useDeleteProperty()`: POST / PATCH / DELETE; refresh the list, detail and manager counts.
- `useAssignManager(propertyId)`, `useRemoveManager(propertyId)`: POST / DELETE managers; refresh that property (detail and its managers), the property list (managers are embedded) and the manager list.

## stats.ts
Numbers the frontend computes (money in integer cents). The API gives only `unitCount`; counts by status come from GET /units.
- `countUnits`, `unitCountsByProperty`, `emptyCounts`, `UnitCounts`: units per status.
- `occupancy(counts)`: OCCUPIED / all, 1 decimal; null with 0 units.
- `unitStatusNote`, `typeBreakdown`: KPI notes ("75 occupied, 4 vacant", "3 residential, 1 mixed use").
- `activeRentCentsByProperty(leases)`: rent of ACTIVE leases per property.
- `sumCents`, `formatAddress`, `propertyStatus` (the card badge).
- `buildUnitRows`, `UnitRow`, `needsAttention`, `primaryTenantName`: units of one property with their active / draft lease (sorted with `compareNatural`).

## PropertiesPage.tsx
- `PropertiesPage`: /properties. Unit totals and managers from each property; GET /units only for counts by status, GET /leases (ACTIVE) for rent. PageHeader, 4 KPIs, toolbar (search, Type, Manager for OWNER, then at the right a compact "Sort: ..." select in Cards view and the Cards / Table `ViewToggle`, saved with `useListView("properties", "cards")`), loading / empty / error / no-results states, client paging. Search, filters, sort and page live in the URL (`useClientTable` `inUrl`): `?q=&type=&manager=&sort=&page=`; a manager id is kept while the managers load and dropped only if it isn't in the loaded list. Add Property uses `useAddPropertyFlow`. With no properties: only the header and `NoProperties` (no KPIs, toolbar or header button). KPIs show a Dash when loading failed. Phones (under md): always the list cards (the Cards / Table toggle is hidden, the saved choice is kept; the big `PropertyCard` is desktop only), search plus a "Filters" sheet with Type, Manager (OWNER) and Sort by.

## AddPropertyFlow.tsx
- `useAddPropertyFlow()`: `{ open, modals }`. `open()` shows PropertyFormModal; after a create with a "Number of units" it runs the "Add unit 1 of N" chain (`UnitFormModal`, a new key per step). The page renders `modals` once, so the chain survives the page leaving its no-properties state. Used by Dashboard, Properties, Units, Leases and Rent Roll.

## PropertyCard.tsx
- `PropertyCard`: the clickable card of the Cards view (passes `from: "properties"`). `PropertyCardSkeleton`: its loading shape.
- `PropertyImage`: neutral block with the type badge (no photos yet). `ManagerLine`: "Name, Property Manager" / "Name +2" / "No manager assigned".
- `PropertyRow`: one property plus its counts by status, occupancy and rent (units total and managers are read from the property).

## PropertiesTable.tsx
- `PropertiesTable`: the Table view (rows and cards pass `from: "properties"`; DataTable; Name, Units, Occupancy, Value sortable; row opens the detail). On phones a `CardList`: name, address, property status badge, Units / Occupancy / Type, Monthly rent; the card links to the detail page.

## PropertyDetailPage.tsx
- `PropertyDetailPage`: /properties/:id. One line on top, "[←] Properties › {name}" (`BackBreadcrumb`): with `PropertyPageState` `from: "properties"` (list cards and rows) back goes back in history and keeps the list's filters and search, else it opens /properties. Unit drawer lease links pass `from: "property"` with the property, so the lease page goes back here. Tiles from `features/shared/DetailParts`, header card (KPI tiles, `unitCount`, embedded managers, tabs), Overview (units needing attention, Details, Managers) and Units tabs, Edit (`property.edit`: owner, or a manager with `properties.edit`) / Delete (owner only), "Add unit" (primary, `unit.create`), unit rows open the `UnitDrawer`, "Property not found" on 404. Sets the page title to the property name. On phones the header buttons go under the name and fill the width (44px).

## PropertyUnitsTable.tsx
- `PropertyUnitsTable`: units with tenant, rent, lease and status (expiring leases show "Expiring"); 25 per page; optional `onRowClick`. On phones flat cards inside the parent card (unit, type · sq ft, status, Tenant / Lease, Rent); the card is a button that opens the unit drawer.

## PropertyManagersCard.tsx
- `PropertyManagersCard`: assigned managers with emails (GET /properties/:id/managers); OWNER can Remove (ConfirmDialog) and Assign from GET /managers. Shows backend 400 / 409 messages.

## PropertyFormModal.tsx
- `PropertyFormModal`: add / edit modal (react-hook-form + zod). Acquisition date is "YYYY-MM-DD" in and out (kept as it is). Trims text, US state / ZIP format (on edit only when changed), PATCH sends only changed fields (`description: null` when cleared), property value more than $0 and at most $9,999,999,999.99, "Assign managers" on create only with `manager.assign` (owner; a manager sending `managerIds` gets 403, and is assigned to the new property automatically), "Number of units" (0–200, not sent) on create only with `unit.create`, `onCreated(property, unitCount)`, server errors under fields or at the top, "Discard changes?" on close. Mount it only while open.

The desktop Cards view uses the design system `CardGrid` (equal-width columns; long text never widens a card).
