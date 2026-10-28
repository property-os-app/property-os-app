# src/features/tenants

Tenants: one directory page (/tenants) with Cards / Table views, the tenant drawer, the add / edit modal and delete. GET /tenants returns every tenant for both roles (on purpose); lease data comes from GET /leases, which is scoped, so a manager sees "No lease" for tenants without a lease on an assigned property. The Property select is the sidebar scope.

## keys.ts
- `tenantKeys`: `all`, `list`, `detail(id)`.

## hooks.ts
- `useTenants()`: GET /tenants (all tenants, newest first). Search and filters run on the client.
- `useTenant(id)`: GET /tenants/:id (with `idNumber` and `createdBy`; 404 = not found).
- `useCreateTenant()`: POST /tenants; refetches the tenants (the answer has no `createdBy`).
- `useUpdateTenant()`: PATCH /tenants/:id; refetches tenants (list and detail) and leases (they embed name and email).
- `useDeleteTenant()`: DELETE /tenants/:id (owner, or a manager with `tenants.delete`); 409 while the tenant is on any lease.

## stats.ts
- `TenantRow`: a tenant, the visible leases they are on and their `current` lease.
- `currentLease(leases)`: the ACTIVE one (soonest end), else the newest DRAFT, else the ENDED / TERMINATED one with the latest end.
- `buildTenantRows(tenants, leases)`: rows sorted balance highest first (no lease last), then name.
- `LeaseFilter`, `matchesLeaseFilter(row, filter)`: All / Active (includes expiring) / Expiring / Draft / Ended (+ terminated) / No lease.
- `hasBalance(row)`: current lease balance above $0.
- `RentStatus`, `rentStatus(lease)`: overdue / today / ok for an ACTIVE lease (UTC today, backend rule); null otherwise.
- `unitLine(lease)`: "Unit 4B, Maple Court".
- `tenantSearchText(row)`: name, email, phone, unit number, property name.
- KPIs: `movedInThisQuarter` (valid "YYYY-MM-DD" move-in dates in the current local quarter), `activeLeaseCount`, `outstanding` (count + total, each lease once), `recentMoveOuts` (last 30 days).

## TenantParts.tsx
- `TenantLeaseBadge`: current lease badge or neutral "No lease".
- `RentStatusBadge`: "Overdue" / "Due today" / "Up to date", or Dash.
- `BalanceValue`: owed in danger, "$0.00" in success, "Credit $X" when negative, Dash without a lease.

## TenantsPage.tsx
- `TenantsPage`: /tenants. PageHeader with "Add Tenant", 4 KPIs, toolbar (search, Property = scope, Lease status, "Has balance" chip, then at the right a compact "Sort: ..." select in Cards view and the Cards / Table `ViewToggle`, saved with `useListView("tenants", "cards")`), all states, drawer, modals and delete dialog. Search, filters, sort and page live in the URL (`useClientTable` `inUrl`): `?q=&lease=&balance=&sort=&page=`. Phones (under md): always the list cards (the Cards / Table toggle is hidden, the saved choice is kept), search plus a "Filters" sheet with Property (all pages), Lease status, Has balance and Sort by; the count and "Clear filters" leave the app-wide property alone. Tenants aren't tied to properties, so the page shows even with no properties. KPIs show a Dash when loading failed.

## TenantCard.tsx
- `TenantCard`: compact clickable card (avatar, name, unit line, kebab; email and phone as `ContactLink`s; Lease / Rent status / Balance). The kebab and the contact links / copy buttons never open the card. Red left strip when the current lease is overdue (`rentStatus`). `TenantCardSkeleton`: its loading shape.

## TenantsTable.tsx
- `TenantsTable`: the Table view (Tenant and Balance sortable; kebab with Edit / Delete when allowed). Email (under the name) and Phone are `ContactLink`s (tap to email / call, copy) that don't trigger the row click. Row click calls `onOpen`. On phones a `CardList` of the same rows: avatar, name, unit line, lease badge, Rent status / Phone (`ContactLink`), Balance, the email (`ContactLink`) on its own line at the bottom, same kebab; the card is a button that opens the drawer. Red strip (cards and table rows, `DataTable rowStrip`) when the current lease is overdue (`rentStatus`).

## TenantDrawer.tsx
- `TenantDrawer`: lg drawer. Overview (current ACTIVE lease card + Rent / Balance / Lease ends cards; Details with the ID number; Email (wraps) and Phone are `ContactLink`s) and Leases tab (lease, unit, period, rent, status, Primary / Co-tenant; cards on phones; "Add lease" opens the lease wizard with this tenant as primary, with `lease.create`). "Open lease" on the active lease card and a Leases row click go to /leases/:id with `from: "tenants"` (the lease page goes back to Tenants). Move-in date via `formatDate` (Dash when missing or invalid); "Added on" is the local day of `createdAt` (`formatTimestampDate`). Footer: Delete (`tenant.delete`) and Edit tenant (`tenant.edit`). "Tenant not found" on 404. Closes itself after a delete.

## TenantFormModal.tsx
- `TenantFormModal`: add / edit modal (react-hook-form + zod, ../property-os-api/docs/frontend-handoff/rules.md Tenants). Trims text, keeps the move-in date as "YYYY-MM-DD", PATCH sends only changed fields (null when ID number, address, move-in date or notes are cleared), 409 duplicate email under Email, "Discard changes?" on close. Edit mode loads GET /tenants/:id first. Optional `onSaved(tenant)` runs after a save (the lease wizard selects the new tenant). Mount it only while open.

## TenantDeleteDialog.tsx
- `TenantDeleteDialog`: ConfirmDialog for DELETE /tenants/:id with busy state and the backend's 409 inside; toast and `onDeleted` on success.

The desktop Cards view uses the design system `CardGrid` (equal-width columns; long text never widens a card).
