# src/features/properties

Properties: the list page (Cards / Table), the detail page, the add / edit modal and manager assignment. Properties ignore the sidebar property scope on purpose (only Units, Leases and Rent Roll use it).

## keys.ts
- `propertyKeys`: `all`, `list`, `detail(id)`, `managers(id)` (managers sit under the detail key).
- `managerKeys`: `all` (GET /managers).

## hooks.ts
- `useProperties()`: GET /properties (OWNER all, manager assigned). Also used by the scope picker.
- `useProperty(id)`: GET /properties/:id (404 = missing or not visible).
- `usePropertyManagers(id)`: GET /properties/:id/managers.
- `usePropertyManagersMap(ids)`: the same for many properties at once (`useQueries`); returns `{ byProperty, isPending, isError }`.
- `useManagers()`: GET /managers, only runs for OWNER.
- `useCreateProperty()`, `useUpdateProperty()`, `useDeleteProperty()`: POST / PATCH / DELETE; refresh the list, detail and manager counts.
- `useAssignManager(propertyId)`, `useRemoveManager(propertyId)`: POST / DELETE managers; refresh that property's managers and the manager list.

## stats.ts
Numbers the frontend computes (money in integer cents).
- `countUnits`, `unitCountsByProperty`, `emptyCounts`, `UnitCounts`: units per status.
- `occupancy(counts)`: OCCUPIED / all, 1 decimal; null with 0 units.
- `unitStatusNote`, `typeBreakdown`: KPI notes ("75 occupied, 4 vacant", "3 residential, 1 mixed use").
- `activeRentCentsByProperty(leases)`: rent of ACTIVE leases per property.
- `sumCents`, `formatAddress`, `propertyStatus` (the card badge).
- `buildUnitRows`, `UnitRow`, `needsAttention`, `primaryTenantName`: units of one property with their active / draft lease.

## PropertiesPage.tsx
- `PropertiesPage`: /properties. PageHeader, 4 KPIs, toolbar (Cards/Table saved in localStorage, search, Type, Manager for OWNER), loading / empty / error / no-results states, client paging.

## PropertyCard.tsx
- `PropertyCard`: the clickable card of the Cards view. `PropertyCardSkeleton`: its loading shape.
- `PropertyImage`: neutral block with the type badge (no photos yet). `ManagerLine`: "Name, Property Manager" / "Name +2" / "No manager assigned".
- `PropertyRow`: one property plus its counts, occupancy, rent and managers.

## PropertiesTable.tsx
- `PropertiesTable`: the Table view (DataTable; Name, Units, Occupancy, Value sortable; row opens the detail).

## PropertyDetailPage.tsx
- `PropertyDetailPage`: /properties/:id. Breadcrumb, header card (KPI tiles, managers, tabs), Overview (units needing attention, Details, Managers) and Units tabs, Edit / Delete for OWNER, "Property not found" on 404. Sets the page title to the property name.

## PropertyUnitsTable.tsx
- `PropertyUnitsTable`: units with tenant, rent, lease and status (expiring leases show "Expiring"); 25 per page.

## PropertyManagersCard.tsx
- `PropertyManagersCard`: assigned managers; OWNER can Remove (ConfirmDialog) and Assign from GET /managers. Shows backend 400 / 409 messages.

## PropertyFormModal.tsx
- `PropertyFormModal`: add / edit modal (react-hook-form + zod). Trims text, US state / ZIP format (on edit only when changed), PATCH sends only changed fields (`description: null` when cleared), managers on create only, server errors under fields or at the top, "Discard changes?" on close. Mount it only while open.
