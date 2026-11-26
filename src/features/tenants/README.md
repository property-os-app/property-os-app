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
- `currentLease(leases)`: the ACTIVE one (soonest end), else the newest DRAFT, else the ENDED / TERMINATED one that ended last (`leaseEndDate`); a cancelled one only when there is nothing else.
- `buildTenantRows(tenants, leases)`: rows sorted balance highest first (no lease last), then name.
- `LeaseFilter`, `matchesLeaseFilter(row, filter)`: All / Active (includes expiring) / Expiring / Draft / Ended (+ terminated) / No lease.
- `hasBalance(row)`: current lease balance above $0.
- `RentStatus`, `rentStatus(lease)`: overdue / today / ok for an ACTIVE lease (UTC today, backend rule); null otherwise.
- `unitLine(lease)`: "Unit 4B, Maple Court".
- `tenantSearchText(row)`: name, email, phone, unit number, property name. A missing email or phone is null (never matches).
- `preferredContactText(tenant)`: "Email", or "Email (no email on file)".
- KPIs: `movedInThisQuarter` (valid "YYYY-MM-DD" move-in dates in the current local quarter), `activeLeaseCount`, `outstanding` (count + total, each lease once), `recentMoveOuts` (ended in the last 30 days, `leaseEndDate`; old (history-only) and cancelled leases don't count). Tests: `stats.test.ts` (`currentLease`, `recentMoveOuts`).

## form.ts
- `tenantSchema`, `tenantDefaults`, `TenantFormInput`, `TenantFormOutput`, `TENANT_FIELDS`: the tenant form (only the name is required). `isEmailOrEmpty`, `EMAIL_MESSAGE`: the optional email check (also the new tenants of Add old lease).
- `tenantCreateBody(v)`: POST body, optional fields only when filled. `tenantChanges(v, tenant)`: PATCH body, changed fields only, null when cleared.
- `form.test.ts`: optional email and phone, clearing sends null.

## TenantParts.tsx
- `TenantLeaseBadge`: current lease badge or neutral "No lease".
- `RentStatusBadge`: "Overdue" / "Due today" / "Up to date", or Dash.
- `BalanceValue`: bold when owed, danger only when overdue (`rentStatus`), "Due Nov 1" under a balance not due yet (`notDueCaption`); "$0.00" in success, "Credit $X" when negative, Dash without a lease.

## TenantsPage.tsx
- `TenantsPage`: /tenants. PageHeader with "Add Tenant", 4 KPIs, toolbar (search, Property = scope, Lease status, "Has balance" chip, then at the right a compact "Sort: ..." select in Cards view and the Cards / Table `ViewToggle`, saved with `useListView("tenants", "cards")`), all states, drawer, modals and delete dialog. Search, filters, sort and page live in the URL (`useClientTable` `inUrl`): `?q=&lease=&balance=&sort=&page=`. Phones (under md): always the list cards (the Cards / Table toggle is hidden, the saved choice is kept), search plus a "Filters" sheet with Property (all pages), Lease status, Has balance and Sort by; the count and "Clear filters" leave the app-wide property alone. Tenants aren't tied to properties, so the page shows even with no properties. KPIs show a Dash when loading failed.

## TenantCard.tsx
- `TenantCard`: compact clickable card (avatar, name, unit line, kebab; email and phone as `ContactLink`s; Lease / Rent status / Balance). The kebab and the contact links / copy buttons never open the card. Red left strip when the current lease is overdue (`rentStatus`). `TenantCardSkeleton`: its loading shape. Without one: "Email not provided" / "Phone not provided".

## TenantsTable.tsx
- `TenantsTable`: the Table view (Tenant, Phone, Unit, Lease / rent (the lease badge and the rent status stacked in one column), Balance; Tenant and Balance sortable; kebab with Edit / Delete when allowed). Email (under the name) and Phone are `ContactLink`s (tap to email / call, copy) that don't trigger the row click. Row click calls `onOpen`. On phones a `CardList` of the same rows: avatar, name, unit line, lease badge, Rent status / Phone (`ContactLink`), Balance, the email (`ContactLink`) on its own line at the bottom, same kebab; the card is a button that opens the drawer. Red strip (cards and table rows, `DataTable rowStrip`) when the current lease is overdue (`rentStatus`). A missing phone shows "Not provided", a missing email "Email not provided".

## TenantDrawer.tsx
- `TenantDrawer`: lg drawer, on the Tenants page and over the lease page (`onLeasePage`: that lease only closes the drawer, another one opens with Leases as its parent). Overview ("Current lease" card for an ACTIVE lease: unit, lease number and period, badge, Open lease, Rent / Balance / Lease ends tiles; "Contact" card with Email and Phone (`ContactActions`), Preferred contact and Address tiles and "Edit tenant" with `tenant.edit`; "Personal" card with Full name, Tenant type, ID / passport number and Move-in date; Notes soft box, hidden when empty; a muted "Added by {email} ({role}) on {date}" line that wraps; skeletons while GET /tenants/:id loads, InlineError with Retry on an error), Documents tab (`DocumentsPanel`, upload and delete with `tenant.edit`; hidden after a 404, when a manager may not see this tenant's documents) and Leases tab (lease, unit, period, rent, status, Primary / Co-tenant; cards on phones; "Add lease" opens the lease wizard with this tenant as primary, with `lease.create`). "Open lease" on the active lease card and a Leases row click go to /leases/:id with `from: "tenants"` (the lease page goes back to Tenants). Move-in date via `formatDate`; the "Added by" date is the local day of `createdAt` (`formatTimestampDate`). Footer: Delete (`tenant.delete`) and Edit tenant (`tenant.edit`). "Tenant not found" on 404. Closes itself after a delete. The Leases tab is GET /leases?tenantId= (old leases included) with its loading and error states. Missing values (email, phone, address, ID number, move-in date) show "Not provided".

## TenantFormModal.tsx
- `TenantFormModal`: add / edit modal (react-hook-form + zod, ../property-os-api/docs/frontend-handoff/rules.md Tenants). Trims text, keeps the move-in date as "YYYY-MM-DD", PATCH sends only changed fields (null when ID number, address, move-in date or notes are cleared), 409 duplicate email under Email, "Discard changes?" on close. Edit mode loads GET /tenants/:id first. Optional `onSaved(tenant)` runs after a save (the lease wizard selects the new tenant). Mount it only while open. Email and phone are optional; rules and bodies are in `form.ts`.

## TenantDeleteDialog.tsx
- `TenantDeleteDialog`: ConfirmDialog for DELETE /tenants/:id with busy state and the backend's 409 inside; toast and `onDeleted` on success.

The desktop Cards view uses the design system `CardGrid` (equal-width columns; long text never widens a card).
