# src/features/leases

Leases: the /leases page (KPIs, toolbar, table), the /leases/:id lease page, the 4-step Add / Edit Lease wizard, activate, end and delete draft. Also the lease helpers shared by the unit drawer and the tenants page. Every lease change refreshes leases, units, tenants and the rent roll.

## keys.ts
- `leaseKeys`: `all`, `lists`, `list({ propertyId?, unitId?, status? })`, `detail(id)`, `tagSuggestions`.
- `leaseKeys.ledger(id)`: GET /leases/:id/ledger, under `["leases"]` so every lease refresh also refreshes ledgers.
- `LeaseListParams`: the list filters. `rentRollPrefix`: `["rent-roll"]`, invalidated after lease and money changes.

## hooks.ts
- `useLeases(params, { enabled? })`: GET /leases (OWNER all, manager assigned), newest first.
- `useLease(id, placeholder?)`: GET /leases/:id; the list row shows while it loads.
- `useTagSuggestions()`: GET /leases/tag-suggestions.
- `useCreateLease()`: POST /leases (DRAFT, or status ACTIVE to create and activate in one call).
- `useUpdateLease()`: PATCH /leases/:id. `useActivateLease()`: POST /leases/:id/activate. `useEndLease()`: POST /leases/:id/end. `useDeleteLease()`: DELETE /leases/:id (DRAFT only).
- `leaseErrorText(err)`: like `errorText`, with friendly field names in lease messages (lease page signature and tag saves).
- `ActivateError`, `activateErrorOf(err)`: a failed activation as an InlineError (friendly missing field names; `fixable` shows "Edit lease").
- `useActivateAction()`: activate + the success toast; `run(id)` returns null or an `ActivateError`.

## stats.ts
- `leasePeriod`, `DueState`, `dueState`, `dueNote`, `leaseEndsNote`: card and tile notes (overdue uses UTC today).
- `primaryTenant`, `coTenants`, `isClosed` (ENDED / TERMINATED), `isPastEnd` (ACTIVE, end before UTC today), `expiresWithin(lease, days)`, `startedThisMonth`, `leaseUnitLine`, `pastEndNote`: page and drawer helpers.
- `compareLeasesDefault`: ACTIVE by soonest end, then DRAFT newest first, then ENDED / TERMINATED latest end first.
- `activationFieldLabels`, `missingToActivate(parts)`, `leaseMissing(lease)`, `parseMissingMessage(msg)`: what activation still needs, with friendly names.
- `leaseFieldLabels`, `leaseFieldLabel(field)`: friendly names for every lease field.
- `LeaseFieldsMessage`, `parseLeaseFieldsMessage(msg)`: reads "Cannot activate lease: missing ...", "Lease X is ACTIVE, so it needs: ..." and the ENDED / TERMINATED "Not allowed: ..." message.
- `friendlyLeaseMessage(msg)`: those three with friendly field names; other messages unchanged.
- `termMonthsOf(start, end)`: whole months, end date included. `termEndDate(start, months)`: start + months - 1 day.
- `MAX_TAGS`, `MAX_TAG_LENGTH`, `normalizeTag`: the tag rules.

## form.ts
- `STEPS`, `STEP_FIELDS`, `SERVER_FIELDS`, `stepOf`, `firstErrorStep`: the wizard steps and which fields each shows.
- `schema`, `FormInput`, `FormOutput`: format rules only (activation is checked separately). End date after start date on every status (like the backend). Money max $9,999,999,999.99, grace period max 2,147,483,647.
- `defaults(presets)`: from a lease (edit) or the preset unit / scope / tenant (create).
- `formMissing(values)`: missing to activate, from the form.
- `createBody(values, activate)`: POST body, empty fields left out. `updateBody(values, lease)`: PATCH with only the changed fields and the per-status rules (closed: notes and tags; ACTIVE: never unitId, never null for required fields).
- `serverErrorStep`: the step to show after a server error (field, overlap, missing, ACTIVE-needs / closed: first named field).

## LeasesPage.tsx
- `LeasesPage`: /leases. KPIs (Active, Expiring in 60 days, Past end date, Monthly rent), toolbar (status segments, search, Property = sidebar scope, e-sign), the table with its 5 states, wizard, end and delete. A row click opens /leases/:id. Kebab actions open their modal on the list; a failed kebab Activate opens the lease page with the reason (router state `LeasePageState`). Old `/leases?lease=ID` links redirect to `/leases/ID`.

## LeasesTable.tsx
- `LeasesTable`: DataTable columns (tenant, unit, rent, term, status, tags, e-signature, expires, balance via the ledger's `BalanceText`) and the kebab (Open, Edit, Activate, End lease, Delete draft).

## LeasePage.tsx
- `LeasePage`: /leases/:id (replaces the old lease and rent roll ledger drawers). Back arrow ("Leases" or "Rent Roll · {Month}") only when opened from a list in this tab (router state `fromList`): history back, or the list URL without an in-app entry; tab switches keep the state. Sidebar highlights Rent Roll when opened from there, else Leases (`usePageNav`). Breadcrumb "Leases / {number}", or "Rent Roll · {Month} / {number}" back to that month with `?from=rent-roll&month=`. Header card: avatar + primary tenant (H1), "Unit, property · dates · number" ("Draft" without dates), lease and e-sign badges, actions by status and role (DRAFT: Delete draft, Edit, Activate; ACTIVE: End lease, Edit, Add charge, Record Payment; ENDED / TERMINATED: Edit notes and tags, Add charge, Record Payment primary only when owed), wrapping on small screens. Tiles: Current balance and Total paid (ledger summary, Retry on error), Monthly rent, Lease ends ("in n days" / "ended n days ago"). Activation error + `LeaseAlert` under the header. Tabs in `?tab=ledger|details|tenants` (default Ledger from the Rent Roll, else Details). DRAFT ledger: "Activate the lease to add charges and payments." 404 "Lease not found", load error with Retry, skeletons. Title "Lease {number}". After Delete draft it goes to /leases. Add charge bills the Rent Roll month when opened from there, else the current UTC month.
- `LeasePageState`: router state: `fromList` (back arrow) and `activateError` from the list kebab.

## LeaseAlert.tsx
- `LeaseAlert`: the first alert that applies (draft missing fields, past end date, overdue, expiring soon), or nothing.

## LeaseTabs.tsx
- `DetailsTab`: key values (tenant, co-tenants, term, rent, deposit, frequency, auto-renew, late fee, number, balance, notes) in a card; E-signature (badge + Select, PATCH `signatureStatus`) and Tags (`TagEditor`, PATCH `tags`) cards. Save errors use `leaseErrorText`.
- `TenantsTab`: the lease's tenants (avatar, name, email, Primary / Co-tenant), or "No tenants yet".

## LeaseWizard.tsx
- `LeaseWizard`: the Add / Edit Lease modal (Stepper, Back / Cancel / Save as draft / Continue or Create & activate / Save changes). Opens TenantFormModal over itself for "Add new tenant".

## LeaseWizardSteps.tsx
- `PartiesStep`, `TermsStep`, `DepositStep`, `ReviewStep`: the 4 step bodies. `StepContext`: what they get from the wizard.

## TenantPicker.tsx
- `TenantPicker`: primary tenant (search, results, chosen card with Change). `CoTenantPicker`: co-tenants as removable tags + search. `PickedTenant`: id, name, email.

## TagEditor.tsx
- `TagEditor`: tag chips with remove, "+ Add tag" input and suggestion chips; enforces the tag rules.

## LeaseEndModal.tsx
- `LeaseEndModal`: "End lease {number}", Ended or Terminated.

## LeaseDeleteDialog.tsx
- `LeaseDeleteDialog`: ConfirmDialog for deleting a draft; 409 shown inside.

## LeaseParts.tsx
- `LeaseBadge`: lease StatusBadge, "Expiring" when `endingSoon`.
- `StatCard`: small drawer card (label, big value, optional note). Used by the unit and tenant drawers.
