# src/features/leases

Leases: the /leases page (KPIs, toolbar, table), the lease drawer, the 4-step Add / Edit Lease wizard, activate, end and delete draft. Also the lease helpers shared by the unit drawer and the tenants page. Every lease change refreshes leases, units, tenants and the rent roll.

## keys.ts
- `leaseKeys`: `all`, `lists`, `list({ propertyId?, unitId?, status? })`, `detail(id)`, `tagSuggestions`.
- `LeaseListParams`: the list filters. `rentRollPrefix`: `["rent-roll"]`, invalidated after lease changes (Rent Roll comes later).

## hooks.ts
- `useLeases(params, { enabled? })`: GET /leases (OWNER all, manager assigned), newest first.
- `useLease(id, placeholder?)`: GET /leases/:id; the list row shows while it loads.
- `useTagSuggestions()`: GET /leases/tag-suggestions.
- `useCreateLease()`: POST /leases (DRAFT, or status ACTIVE to create and activate in one call).
- `useUpdateLease()`: PATCH /leases/:id. `useActivateLease()`: POST /leases/:id/activate. `useEndLease()`: POST /leases/:id/end. `useDeleteLease()`: DELETE /leases/:id (DRAFT only).
- `ActivateError`, `activateErrorOf(err)`: a failed activation as an InlineError (friendly missing field names; `fixable` shows "Edit lease").
- `useActivateAction()`: activate + the success toast; `run(id)` returns null or an `ActivateError`.

## stats.ts
- `leasePeriod`, `DueState`, `dueState`, `dueNote`, `leaseEndsNote`: drawer cards and notes (overdue uses UTC today).
- `primaryTenant`, `coTenants`, `isClosed` (ENDED / TERMINATED), `isPastEnd` (ACTIVE, end before UTC today), `expiresWithin(lease, days)`, `startedThisMonth`, `leaseUnitLine`, `pastEndNote`: page and drawer helpers.
- `compareLeasesDefault`: ACTIVE by soonest end, then DRAFT newest first, then ENDED / TERMINATED latest end first.
- `activationFieldLabels`, `missingToActivate(parts)`, `leaseMissing(lease)`, `parseMissingMessage(msg)`: what activation still needs, with friendly names.
- `termMonthsOf(start, end)`: whole months, end date included. `termEndDate(start, months)`: start + months - 1 day.
- `MAX_TAGS`, `MAX_TAG_LENGTH`, `normalizeTag`: the tag rules.

## form.ts
- `STEPS`, `STEP_FIELDS`, `SERVER_FIELDS`, `stepOf`, `firstErrorStep`: the wizard steps and which fields each shows.
- `schema`, `FormInput`, `FormOutput`: format rules only (activation is checked separately). End date after start date is checked for drafts too.
- `defaults(presets)`: from a lease (edit) or the preset unit / scope / tenant (create).
- `formMissing(values)`: missing to activate, from the form.
- `createBody(values, activate)`: POST body, empty fields left out. `updateBody(values, lease)`: PATCH with only the changed fields and the per-status rules (closed: notes and tags; ACTIVE: never unitId, never null for required fields).
- `friendlyServerMessage`, `serverErrorStep`: show server errors on the right step.

## LeasesPage.tsx
- `LeasesPage`: /leases. KPIs (Active, Expiring in 60 days, Past end date, Monthly rent), toolbar (status segments, search, Property = sidebar scope, e-sign), the table with its 5 states, drawer, wizard, end and delete. Kebab actions open their modal directly; a failed kebab Activate opens the drawer with the reason.

## LeasesTable.tsx
- `LeasesTable`: DataTable columns (tenant, unit, rent, term, status, tags, e-signature, expires, balance) and the kebab (Open, Edit, Activate, End lease, Delete draft).

## LeaseDrawer.tsx
- `LeaseDrawer`: lg drawer. Details (alert card, key values, e-signature Select, tags) and Tenants tabs. Footer by status (hidden without `lease.edit`). Activate shows its error with an "Edit lease" button. Closes itself after a delete.

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
- `StatCard`: small drawer card (label, big value, note).
