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
- `useLeaseDocument()`: GET /leases/:id/document as a blob (`{ id, download }`), a mutation so it runs only on a click; 409 when the lease has no template.
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
- `leaseFieldLabels`, `leaseFieldLabel(field)`: friendly names for every lease field (`templateId` → "Template").
- `templateLine(lease)`: "Standard Lease – 12-month · v2" (template and pinned version), or null.
- `LeaseFieldsMessage`, `parseLeaseFieldsMessage(msg)`: reads "Cannot activate lease: missing ...", "Lease X is ACTIVE, so it needs: ..." and the ENDED / TERMINATED "Not allowed: ..." message.
- `friendlyLeaseMessage(msg)`: those three with friendly field names; other messages unchanged.
- `firstRentDate(start, dueDay)`: first due date on or after the start (clamped to the month's last day).
- `termMonthsOf(start, end)`: whole months, end date included. `termEndDate(start, months)`: start + months - 1 day.
- `MAX_TAGS`, `MAX_TAG_LENGTH`, `normalizeTag`: the tag rules.

## form.ts
- `STEPS`, `STEP_FIELDS`, `SERVER_FIELDS`, `stepOf`, `firstErrorStep`: the wizard steps and which fields each shows.
- `schema`, `FormInput`, `FormOutput`: format rules only (activation is checked separately). End date after start date on every status (like the backend). Money max $9,999,999,999.99, grace period max 2,147,483,647.
- `defaults(presets)`: from a lease (edit, `templateId` from `lease.template`) or the preset unit / scope / tenant (create, no template: the wizard preselects the default).
- `formMissing(values)`: missing to activate, from the form.
- `createBody(values, activate)`: POST body, empty fields left out (`templateId` only when picked). `updateBody(values, lease)`: PATCH with only the changed fields and the per-status rules (closed: notes and tags; ACTIVE: never unitId, never null for required fields); `templateId` only when it changed, `null` when cleared.
- `serverErrorStep`: the step to show after a server error (field, overlap or template message: Terms, missing, ACTIVE-needs / closed: first named field).

## templatePrefill.ts
- `templateEndDate({ start, end, autoEnd, months })`: the end date to write from a template's `defaultTermMonths` (start + months − 1 day), or null. Only with a start and a term, and only when the end date is empty or still the one the prefill wrote (`autoEnd`); a typed or term-button end date is never overwritten. `TemplateEndInput`: its input.

## templateOptions.ts
- `templateOptions(list, current, extra)`: the wizard's Template options (`TemplateOption`: value, label, months). The default is marked; the lease's own template shows its pinned version ("· v1 (this lease's version; latest is v2)"); an archived current template is added on top; templates made in the wizard (`extra`) show before the list refetches.

## LeaseDocumentCard.tsx
- `LeaseDocumentCard({ lease, canEdit })`: Details tab card "Lease document": template and version (+ Archived), Preview PDF (new tab opened on the click, then the blob) and Download PDF (filename from Content-Disposition, else "{leaseNumber}.pdf"), each with "Making PDF..."; errors as a toast. Without a template: "No template, so this lease has no PDF yet."

## LeasesPage.tsx
- `LeasesPage`: /leases. KPIs (Active, Expiring in 60 days, Past end date, Monthly rent), toolbar (status segments, search, Property = sidebar scope, e-sign), the table with its 5 states, wizard, end and delete. Desktop: Cards / Table toggle at the right end of the toolbar (`ViewToggle`, saved per page with `useListView("leases", "table")`, default Table); Cards view shows the phone cards in a grid (`LeasesTable cards`) with a compact "Sort: ..." select (no column headers there).  A row click opens /leases/:id. Kebab actions open their modal on the list; a failed kebab Activate opens the lease page with the reason (router state `LeasePageState`). Old `/leases?lease=ID` links redirect to `/leases/ID`. Search, filters, sort and page live in the URL (`useClientTable` `inUrl`): `?q=&status=&esign=&sort=&page=`. Phones (under md): search plus a "Filters" button whose sheet holds the status segments, Property, E-signature and Sort by; "Property (all pages)" is the app-wide choice, so the count and "Clear filters" leave it (and the search) alone. With no properties (GET /properties returned []) the page shows only the header and `NoProperties` (owner: Add property via `useAddPropertyFlow`). KPIs show a Dash when loading failed.

## LeasesTable.tsx
- `LeasesTable`: DataTable columns (tenant, unit, rent, status (+ "Overdue" rent badge, with "E-sign: …" under them), tags (only from 1440px, `wideOnly`; the lease page shows them), expires with the term under it, balance via the ledger's `BalanceText`) and the kebab (Open, Edit, Activate, End lease, Delete draft). On phones a `CardList` of the same rows: tenant (+n), unit · property, lease badge (+ "Overdue" rent badge), Rent / Expires / E-sign, Balance, same kebab; the card is a link to the lease page ("← Leases"). With `cards` (desktop Cards view) the same cards in a 1 / 2 / 3-column grid (`CardList grid`). Red strip (cards and table rows, `DataTable rowStrip`) only when behind on rent (`dueState` overdue: balance owed past `oldestUnpaidDueDate`), never for past end.

## LeasePage.tsx
- `LeasePage`: /leases/:id (replaces the old lease and rent roll ledger drawers). One line on top (`BackBreadcrumb`): "[←] {Parent} › {number}". Parent is where the page was opened from (router state `from`): Leases, Dashboard, Tenants (tenant drawer), Units (unit drawer on /units), the property name (unit drawer on a property page), or "Rent Roll · {Month}" (also from `?from=rent-roll&month=`, so a pasted link keeps it). Opened directly: Leases. The arrow and the crumb go back in history when opened from there in this tab, else to the parent's URL; tab switches replace the URL and keep the state, so back skips them. Sidebar highlights the matching item (`usePageNav`). Header card: avatar + primary tenant (H1), "Unit, property · dates · number" ("Draft" without dates), lease and e-sign badges, actions by status and role (DRAFT: Delete draft, Edit, Activate; ACTIVE: End lease, Edit, Add charge, Record Payment; ENDED / TERMINATED: Edit notes and tags, Add charge, Record Payment primary only when owed), wrapping on small screens; on phones the buttons fill the width, two per row, 44px tall. Tiles: Current balance and Total paid (ledger summary, Retry on error), Monthly rent, Lease ends ("in n days" / "ended n days ago"). Activation error + `LeaseAlert` under the header. Tabs in `?tab=ledger|details|tenants` (switching keeps the scroll position) (default Ledger from the Rent Roll, else Details). DRAFT ledger: "Activate the lease to add charges and payments." 404 "Lease not found", load error with Retry, skeletons. Title "Lease {number}". After Delete draft it goes to /leases. Add charge bills the Rent Roll month when opened from there, else the current UTC month.
- `LeasePageState`: router state: `from` (`LeaseOrigin`: "leases" | "rent-roll" | "dashboard" | "tenants" | "units" | "property", the first crumb and back arrow), `property` ({ id, name } with "property") and `activateError` from the list kebab.

## LeaseAlert.tsx
- `LeaseAlert`: the first alert that applies (draft missing fields, past end date, overdue, expiring soon), or nothing. When the lease is overdue (`dueState`) and has a primary tenant, `OverdueActions` shows under whichever alert is showing (past end date wins over overdue).

## OverdueActions.tsx
- `OverdueActions({ lease, primary, since })`: "Call {first name}" (the number after " · " from md) and "Email reminder" as plain `<a>` buttons (tel: / mailto:, via `rentReminderLinks`). The phone comes from `useTenant(primary.id)` (the lease has none), so Call shows once it loads; each button hides without a phone / email. Has a marked spot for a later backend "Send reminder".

## LeaseTabs.tsx
- `DetailsTab`: key values (tenant, co-tenants, term, rent, deposit, frequency, auto-renew, late fee, number, template "Name · vN" (+ Archived) or "No template", balance, notes) in a card; `LeaseDocumentCard`, E-signature (badge + Select, PATCH `signatureStatus`) and Tags (`TagEditor`, PATCH `tags`) cards. Save errors use `leaseErrorText`.
- `TenantsTab`: the lease's tenants (avatar, name, email, phone, Primary / Co-tenant), or "No tenants yet". Email and phone are `ContactLink`s; phones come from the cached GET /tenants list (the lease has none) and are hidden while it loads or fails.

## LeaseWizard.tsx
- `LeaseWizard`: the Add / Edit Lease modal (Stepper, Back / Cancel / Save as draft / Continue or Create & activate / Save changes). Opens TenantFormModal over itself for "Add new tenant". Keeps the "due day set by hand" flag (on in edit mode unless the saved due day is empty). Templates: GET /lease-templates; a new lease preselects the default as a default value (not a change); edit keeps the lease's template. Picking a template or changing the start date runs `templateEndDate` (remembers the end date it wrote). "+ New template" (templates.manage) opens `TemplateEditor` over the wizard and selects the new template. A lease saved as SIGNED shows the template read-only with a note (the backend gives 409).

## LeaseWizardSteps.tsx
- `PartiesStep`, `TermsStep`, `DepositStep`, `ReviewStep`: the 4 step bodies. `StepContext`: what they get from the wizard. Terms starts with "Lease template" (select with "No template", help says whether it sets the end date, "+ New template" action; read-only when signed or closed). Review shows the template. Terms: the due day follows the start date's day (date field and term buttons) until edited by hand; help "Rent is billed on the {nth} of each month, starting {date}." and a first-rent note when it differs from the start. Review: "Rent: {amount}, billed on the {nth} of each month, first rent {date}".

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

## Tests (`npm test`)
- `templatePrefill.test.ts`: `templateEndDate` (2025-12-01 + 12 → 2026-11-30, month-end clamp, never over a hand-set end, follows a new start or another term while still prefilled).
- `templateOptions.test.ts`: `templateOptions` (default label, pinned and newer version, archived current on top, wizard-made templates once).
