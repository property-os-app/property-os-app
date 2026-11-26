# src/features/leases

Leases: the /leases page (KPIs, toolbar, table), the /leases/:id lease page, the 4-step Add / Edit Lease wizard, activate, end and delete draft, and old (history-only) leases (Add old lease form, "Old lease" badge, no billing). Also the lease helpers shared by the unit and tenant pages and the tenants list. Every lease change refreshes leases, units, tenants and the rent roll.

## keys.ts
- `leaseKeys`: `all`, `lists`, `list({ propertyId?, unitId?, status?, historical? })`, `detail(id)`, `tagSuggestions`.
- `leaseKeys.ledger(id)`: GET /leases/:id/ledger, under `["leases"]` so every lease refresh also refreshes ledgers.
- `LeaseListParams`: the list filters. `rentRollPrefix`: `["rent-roll"]`, invalidated after lease and money changes. `tenantId`: leases the tenant is on (primary or co-tenant).

## hooks.ts
- `useLeases(params, { enabled? })`: GET /leases (OWNER all, manager assigned), newest first; `historical: false` leaves old leases out, `true` only old leases.
- `useLease(id, placeholder?)`: GET /leases/:id; the list row shows while it loads.
- `useTagSuggestions()`: GET /leases/tag-suggestions.
- `useLeaseDocument()`: GET /leases/:id/document as a blob (`{ id, download }`), a mutation so it runs only on a click; 409 when the lease has no template.
- `useCreateLease()`: POST /leases (DRAFT, or status ACTIVE to create and activate in one call).
- `useCreateOldLease()`: POST /leases/history, multipart (`{ body, file }`): the old lease (ENDED + SIGNED, `isHistorical`, never billed), its new tenants and the signed lease, all or nothing. Refreshes leases, units, tenants, rent roll and the units' documents. 409 when it overlaps another lease on the unit, or a new tenant's email exists (`TENANT_EMAIL_EXISTS`).
- `useUpdateLease()`: PATCH /leases/:id. `useActivateLease()`: POST /leases/:id/activate. `useEndLease()`: POST /leases/:id/end (with `voidChargesAfterEnd` and `deposit` in one transaction; never retried; answers `LeaseEnded`). `useDeleteLease()`: DELETE /leases/:id (DRAFT and old leases, only with no documents).
- `leaseErrorText(err)`: like `errorText`, with friendly field names in lease messages (lease page signature and tag saves).
- `ActivateError`, `activateErrorOf(err)`: a failed activation as an InlineError (friendly missing field names; `fixable` shows "Edit lease").
- `useActivateAction()`: activate + the success toast; `run(id)` returns null or an `ActivateError`.

## stats.ts
- `leasePeriod` (start to `leaseEndDate`; "Cancelled Nov 25, 2026" when cancelled), `DueState`, `dueState`, `dueNote`, `leaseEndsNote`: card and tile notes (overdue = oldest unpaid due date before UTC today; a balance above $0 alone is never late).
- `notDueCaption(lease)`: "Due Nov 1" / "Due today" under a list balance when nothing of it is late yet (e.g. rent billed early); null otherwise.
- `primaryTenant`, `coTenants`, `isClosed` (ENDED / TERMINATED), `isPastEnd` (ACTIVE, end before UTC today), `expiresWithin(lease, days)`, `startedThisMonth`, `leaseUnitLine`, `pastEndNote`: page helpers. `coTenantEmails(lease)`: for CC, without the missing ones.
- `compareLeasesDefault`: ACTIVE by soonest end, then DRAFT newest first, then ENDED / TERMINATED latest end (`leaseEndDate`) first.
- `autoRenewEditable(lease)`: PATCH `autoRenew` is allowed (DRAFT or ACTIVE, not an old lease; ENDED / TERMINATED give 409).
- `isOldLease(lease)`, `hasLedger(lease)` (not DRAFT, not old), `canDeleteLease(lease, documentCount)` (DRAFT or old, and 0 documents; false while the count is unknown): the old-lease rules.
- `activationFieldLabels`, `missingToActivate(parts)`, `leaseMissing(lease)`, `parseMissingMessage(msg)`: what activation still needs, with friendly names.
- `leaseFieldLabels`, `leaseFieldLabel(field)`: friendly names for every lease field (`templateId` → "Template").
- `templateLine(lease)`: "Standard Lease – 12-month · v2" (template and pinned version), or null.
- `LeaseFieldsMessage`, `parseLeaseFieldsMessage(msg)`: reads "Cannot activate lease: missing ...", "Lease X is ACTIVE, so it needs: ..." and the ENDED / TERMINATED "Not allowed: ..." message (with or without "endedOn" in what can change).
- `friendlyLeaseMessage(msg)`: those three with friendly field names; other messages unchanged.
- `firstRentDate(start, dueDay)`: first due date on or after the start (clamped to the month's last day).
- `pastEndText(lease)`: "Ended 3 days ago but still active" (the alert and the Term card).
- `termMonthsOf(start, end)`: whole months, end date included. `wholeMonthsBetween(start, end)`: the same for dates known to be valid. `termEndDate(start, months)`: start + months - 1 day.
- `MAX_TAGS`, `MAX_TAG_LENGTH`, `normalizeTag`: the tag rules.

## leaseEnd.ts
- `leaseEndDate(lease)`: `cancelledOn ?? endedOn ?? endDate`, the date a lease's end shows and sorts by. `cancelledText(date)`: "Cancelled Nov 25, 2026".
- `isNotStarted(lease)`: ACTIVE, starts after UTC today: ending it cancels it. `endActionLabel(lease)`: "Cancel lease" or "End lease".
- `canEditEndDate(lease)`: ENDED / TERMINATED, not cancelled, not old, started (else the API answers 409).
- `canVoidAfterEnd(lease)`: ENDED / TERMINATED through the app (`endedOn` or `cancelledOn` set), not history-only: "Void rent after end date" applies.
- `defaultEndedOn(startDate)`: today (the earlier of the local and UTC day, never before the start). `endedOnError(value, startDate)`: the form's check, start date to UTC today.
- `endedOnServerError(message)`: a 400 about endedOn with friendly names. `splitEndedOnErrors(messages, friendly)`: what goes under the date and what at the top.

## term.ts
- `termParts(start, end)`: whole months and the days left over (`TermParts`). `termBadge(start, end)`: "12-month fixed", or "1 month, 12 days" when the dates don't make whole months.
- `termView(lease)`: the Term card's badge, bar percent and tone, and text (`TermView`): "Month 7 of 12 · 156 days left" (the total is the nearest whole month), "Starts in N days" (draft, or active before its start), the past-end sentence (warning), "Ended on {endedOn}" with a second line (`note`) "Ended early · planned end …" or "Planned end …" when it was another day, "Cancelled (never moved in) on …" (empty bar). Without `endedOn` (ended before the API had it): "End date was {endDate}" ("is" while it is ahead). Old lease: dates only.

## form.ts
- `STEPS`, `STEP_FIELDS`, `SERVER_FIELDS`, `stepOf`, `firstErrorStep`: the wizard steps and which fields each shows.
- `schema`, `FormInput`, `FormOutput`: format rules only (activation is checked separately). End date after start date on every status (like the backend). Money max $9,999,999,999.99, grace period max 2,147,483,647.
- `defaults(presets)`: from a lease (edit, `templateId` from `lease.template`) or the preset unit / scope / tenant (create, no template: the wizard preselects the default).
- `formMissing(values)`: missing to activate, from the form.
- `petDeposit`: optional money on the Deposit step (same limit as the deposit; locked once ended, like it).
- `createBody(values, activate)`: POST body, empty fields left out (`templateId` only when picked). `updateBody(values, lease)`: PATCH with only the changed fields and the per-status rules (closed: notes and tags; ACTIVE: never unitId, never null for required fields); `templateId` only when it changed, `null` when cleared.
- `serverErrorStep`: the step to show after a server error (field, overlap or template message: Terms, missing, ACTIVE-needs / closed: first named field).

## oldLeaseForm.ts
- `OldLeaseValues`, `OldLeaseField`, `OldLeaseErrors`, `NewTenantErrors`, `emptyOldLease(preset)`: the Add old lease form state. `OldLeaseTenant`: an `ExistingTenantRow` or a `NewTenantRow`; `primaryKey` is the primary's row. `MAX_OLD_LEASE_TENANTS` (10 in all).
- `addExistingTenant`, `addNewTenant`, `removeTenant`, `swapForExisting`: change the rows; a single tenant is always primary, a removed primary is cleared, a swap keeps Primary.
- `validateOldLease(values, today)`: unit, both dates, at least one tenant and one primary; new tenants need a name, a valid email when filled, no email twice; end after start and before UTC today; money and tag limits.
- `oldLeaseBody(values)`: the JSON (rent, deposit and `petDeposit` optional), optional fields only when filled (money as numbers, notes trimmed); never the property. The primary is `primaryTenantId` or one new tenant's `isPrimary`. `oldLeaseRequest(body, file)`: the multipart body (`data`, optional `file`).
- `lastOldLeaseEnd(today)`: yesterday (UTC), the end date input's `max`.
- `oldLeaseErrorField(message, status)`: where a backend message goes (dates and the 409 overlap under End date, tenant messages under Tenants, file messages (any 413 or 415) under the file; others at the top). `oldLeaseServerErrors(err, tenants)`: a whole failed save: `newTenants.N` messages and TENANT_EMAIL_EXISTS under that new tenant's row. `OldLeaseServerError`: its input.

## OldLeaseModal.tsx
- `OldLeaseModal({ presetUnit, presetUnitLine, presetPropertyId, onClose })`: "Add old lease": unit (locked from the unit page, else Property → Unit), `OldLeaseTenants`, start, end (before today), rent, deposit, notes, tags, optional signed lease (`DOCUMENT_RULE`). One request; after saving it stays where you are with a toast. Asks before discarding a filled form.

## OldLeaseTenants.tsx
- `OldLeaseTenants({ value, onChange, errors, canAddNew })`: the tenants section: existing tenants with the searchable `Combobox`, new ones typed in place ("Add new tenant" with `tenant.create`), one Primary (`Radio`). An email someone has already offers "Use existing tenant".

## templatePrefill.ts
- `templateEndDate({ start, end, autoEnd, months })`: the end date to write from a template's `defaultTermMonths` (start + months − 1 day), or null. Only with a start and a term, and only when the end date is empty or still the one the prefill wrote (`autoEnd`); a typed or term-button end date is never overwritten. `TemplateEndInput`: its input.

## templateOptions.ts
- `templateOptions(list, current, extra)`: the wizard's Template options (`TemplateOption`: value, label, months). The default is marked; the lease's own template shows its pinned version ("· v1 (this lease's version; latest is v2)"); an archived current template is added on top; templates made in the wizard (`extra`) show before the list refetches.

## LeaseCard.tsx
- `LeaseCard({ lease, canEdit, onOpenDocuments })`: Details tab card "Lease": Lease number (mono, Copy) and Lease template (name · version, + Archived; "Not set") tiles, then the "Lease document" row: Preview PDF (new tab opened on the click, then the blob) and Download PDF (filename from Content-Disposition, else "{leaseNumber}.pdf"), each with "Making PDF...", errors as a toast; without a template "No template, so this lease has no PDF yet." (nothing on an old lease). The newest signed copy (`signedCopies` of the lease's documents, the query the page already loads): "Signed copy · {name}" with View (only `canViewInBrowser` types) and Download, "+N more in Documents" (`onOpenDocuments`); "No signed copy uploaded yet." "Upload signed lease" (`canManageDocuments` leases) opens `DocumentUpload` in a Modal with Signed lease preselected; Cancel or a save closes it.

## LeasesPage.tsx
- `LeasesPage`: /leases. KPIs (Active, Expiring in 60 days, Past end date, Monthly rent), toolbar (status segments, search, Property = sidebar scope, e-sign), "Show old leases" checkbox (default on; off writes `?old=hide` and asks GET /leases?historical=false; with the view toggle as one group on the right; in the phone Filters sheet too), header "Add old lease" (secondary, opens `OldLeaseModal` with the scope property) next to "Add Lease" (primary), the table with its 5 states, wizard, end and delete. Desktop: Cards / Table toggle at the right end of the toolbar (`ViewToggle`, saved per page with `useListView("leases", "table")`, default Table); Cards view shows the phone cards in a grid (`LeasesTable cards`) with a compact "Sort: ..." select (no column headers there).  A row click opens /leases/:id. Kebab actions open their modal on the list; a failed kebab Activate opens the lease page with the reason (router state `LeasePageState`). Old `/leases?lease=ID` links redirect to `/leases/ID`. Search, filters, sort and page live in the URL (`useClientTable` `inUrl`): `?q=&status=&esign=&sort=&page=`. Phones (under md): search plus a "Filters" button whose sheet holds the status segments, Property, E-signature and Sort by; "Property (all pages)" is the app-wide choice, so the count and "Clear filters" leave it (and the search) alone. With no properties (GET /properties returned []) the page shows only the header and `NoProperties` (owner: Add property via `useAddPropertyFlow`). KPIs show a Dash when loading failed.

## LeasesTable.tsx
- `LeasesTable`: DataTable columns (tenant, unit, rent, status (+ "Overdue" rent badge, with "E-sign: …" under them), tags (only from 1440px, `wideOnly`; the lease page shows them), balance red only when overdue with `notDueCaption` under it; expires (`leaseEndDate`, "Cancelled {date}") with the term under it (not when it ended on another day or was cancelled), balance via the ledger's `BalanceText`) and the kebab (Open, Edit, Activate, End lease or Cancel lease, Delete draft). On phones a `CardList` of the same rows: tenant (+n), unit · property, lease badge (+ "Overdue" rent badge), Rent / Expires / E-sign, Balance, same kebab; the card is a link to the lease page ("← Leases"). With `cards` (desktop Cards view) the same cards in a 1 / 2 / 3-column grid (`CardList grid`). Red strip (cards and table rows, `DataTable rowStrip`) only when behind on rent (`dueState` overdue: balance owed past `oldestUnpaidDueDate`), never for past end.

## LeasePage.tsx
- `LeasePage`: /leases/:id (replaces the old lease and rent roll ledger drawers). One line on top (`BackBreadcrumb`): "[←] {Parent} › {number} [✕]". Parent is where the page was opened from (router state `from`): Leases, Dashboard, Tenants, Units, the property name (`property`), the tenant's name (`from: "tenant"`, back to the tenant page's Leases tab), "Unit 4B, Maple Court" (`from: "unit"`, back to the unit page's Lease history tab), or "Rent Roll · {Month}" (also from `?from=rent-roll&month=`, so a pasted link keeps it), or "Rent Roll · {Year}" from the yearly view (`?from=rent-roll&view=year&year=`, links back to `/rent-roll?view=year&year=`). Opened directly: Leases. The arrow, the crumb, the ✕ and Esc go back in history when opened from there in this tab, else to the parent's URL; tab switches replace the URL and keep the state, so back skips them. Sidebar highlights the matching item (`usePageNav`). Header card: avatar + primary tenant (H1), "Unit, property · dates · number" ("Draft" without dates), lease and e-sign badges, actions by status and role (DRAFT: Delete draft, Edit, Activate; ACTIVE: End lease, Edit, Add charge, Record Payment; ENDED / TERMINATED: Edit notes and tags, Add charge, Record Payment primary only when owed), wrapping on small screens; on phones the buttons fill the width, two per row, 44px tall. Tiles: Current balance and Total paid (ledger summary, Retry on error), Monthly rent, Lease ends ("in n days" / "ended n days ago"). Activation error + `LeaseAlert` under the header. Documents tab (`?tab=documents`, `DocumentsPanel`, upload and delete with `lease.edit`, count in the tab). Old lease (`isHistorical`): no ledger call and no Ledger tab, tiles Monthly rent / Deposit (security + pet, "Security $X · Pet $Y" when there is a pet deposit) / Term / Ended, a "History only – no rent tracked." note instead of `LeaseAlert`, actions only "Edit notes and tags" and "Delete" (only with 0 documents), default tab Details. Tabs in `?tab=ledger|details|tenants` (switching keeps the scroll position) (default Ledger from the Rent Roll, month or year view, else Details). DRAFT ledger: "Activate the lease to add charges and payments." 404 "Lease not found", load error with Retry, skeletons. Title "Lease {number}". After Delete draft it goes to /leases. Add charge bills the Rent Roll month when opened from there, else the current UTC month. The Current balance tile is red only when overdue, and its note adds "includes {amount} not due yet" when only part of the balance is due (`balanceSplit` on the ledger). The last tile (`EndTile`): "Lease ends"; closed: "Ended" `endedOn` / "End date" "actual date not recorded" / "Cancelled" "never moved in". "End lease" reads "Cancel lease" before the start date. The Documents tab also lists the payments' files. The Current balance tile shows "Credit $X" / "Paid ahead" from `summary.credit`.
- The ledger's "From deposit settlement" link opens Details and scrolls to the Deposit card (highlighted until the next tab change); the Deposit card's PMT link opens the Ledger tab, All entries, at that payment.
- `LeasePageState`: router state: `from` (`LeaseOrigin`: "leases" | "rent-roll" | "dashboard" | "tenants" | "units" | "property", the first crumb and back arrow), `property` ({ id, name } with "property") and `activateError` from the list kebab.

## LeaseAlert.tsx
- `LeaseAlert({ lease, split })`: the first alert that applies (draft missing fields, past end date, overdue, expiring soon), or nothing. Overdue text: "$1,200.00 overdue · $1,200.00 more not due yet" from `split` (the ledger's `balanceSplit`), or "The Ledger tab shows the amounts." while it loads or fails. When the lease is overdue (`dueState`) and has a primary tenant, `OverdueActions` shows under whichever alert is showing (past end date wins over overdue).

## OverdueActions.tsx
- `OverdueActions({ lease, primary, since, overdue })`: "Call {first name}" (the number after " · " from md) and "Email reminder" as plain `<a>` buttons (tel: / mailto:, via `rentReminderLinks`). The email quotes `overdue` (the overdue amount, never the whole balance; null leaves it out). The phone comes from `useTenant(primary.id)` (the lease has none), so Call shows once it loads; each button hides without a phone / email. Has a marked spot for a later backend "Send reminder".

## LeaseTabs.tsx
- `TenantsTab`: the lease's tenants (avatar, name, email, phone, Primary / Co-tenant), or "No tenants yet". A row opens the tenant page (`tenantFromLease`; Back returns to this lease); email and phone are `ContactLink`s on top of it; phones come from the cached GET /tenants list (the lease has none) and are hidden while it loads or fails.

## DetailsTab.tsx
- `DetailsTab({ lease, canEdit, onEdit, onOpenDocuments, canSettle, canVoid, onShowPayment, focusDeposit })`: the "Deposits" tile (security + pet total, "Security $X · Pet $Y", deposit status badge, "Not tracked" on an untracked ended lease); `DepositCard` under Financials on ENDED / TERMINATED leases with a deposit; "Void rent after end date" (`VoidAfterEndModal`, money.void, `canVoidAfterEnd`) in the Term card next to "Edit end date". Also left: Financials (`SectionCard` with tiles: Rent + payment frequency badge + "Due on the {nth}", Balance ("Credit $X" / "Paid ahead" from the ledger's `summary.credit`, else `lease.balance` with `dueState`: "Clear" at $0, red + Overdue badge, "Credit $…", "No ledger on a draft"), Security deposit, Late fee + grace rule; "Edit terms" opens the wizard at Terms, draft and active only; an old lease shows only rent and deposit, the rest are API defaults), `LeaseCard`, Term (`termView`, `Bar`; "Edit end date" opens `LeaseEndDateModal` when `canEditEndDate`; an old lease shows its dates only; Auto-renew is a `Toggle` that saves at once (PATCH `autoRenew`, `autoRenewEditable` + `lease.edit`): new value shown and disabled while saving, kept from the answer, back with a toast on an error, toast "Auto-renew on / off"; otherwise an On / Off badge), `LeaseholdersCard`, Internal lease notes (soft box, "Edit" / "Add notes" opens the wizard at its notes step in any status; hidden when empty and not editable). Right: E-signature (badge + Select, PATCH `signatureStatus`) and Tags (`TagEditor`, PATCH `tags`). Save errors use `leaseErrorText`. `DetailsTabProps`.

## LeaseholdersCard.tsx
- `LeaseholdersCard({ lease })`: "Leaseholders", "N occupants", an `IconTile` per tenant: avatar, name, Primary / Co-tenant badge, `ContactActions` (phone from GET /tenants). A tile opens the tenant page (`tenantFromLease`; Back returns to this lease).

## LeaseWizard.tsx
- `LeaseWizard`: the Add / Edit Lease modal (`startAt`: open at the step with this field) (Stepper, Back / Cancel / Save as draft / Continue or Create & activate / Save changes). Opens TenantFormModal over itself for "Add new tenant". Keeps the "due day set by hand" flag (on in edit mode unless the saved due day is empty). Templates: GET /lease-templates; a new lease preselects the default as a default value (not a change); edit keeps the lease's template. Picking a template or changing the start date runs `templateEndDate` (remembers the end date it wrote). "+ New template" (templates.manage) opens `TemplateEditor` over the wizard and selects the new template. A lease saved as SIGNED shows the template read-only with a note (the backend gives 409).

## LeaseWizardSteps.tsx
- `PartiesStep`, `TermsStep`, `DepositStep`, `ReviewStep`: the 4 step bodies. `StepContext`: what they get from the wizard. Terms starts with "Lease template" (select with "No template", help says whether it sets the end date, "+ New template" action; read-only when signed or closed). Review shows the template. Terms: the due day follows the start date's day (date field and term buttons) until edited by hand; help "Rent is billed on the {nth} of each month, starting {date}." and a first-rent note when it differs from the start. Review: "Rent: {amount}, billed on the {nth} of each month, first rent {date}".

## TenantPicker.tsx
- `TenantPicker`: primary tenant (search, results, chosen card with Change). `CoTenantPicker`: co-tenants as removable tags + search. `PickedTenant`: id, name, email. Only the lease wizard uses it.

## TagEditor.tsx
- `TagEditor`: tag chips with remove, "+ Add tag" input and suggestion chips; enforces the tag rules.

## LeaseEndModal.tsx
- `LeaseEndModal`: "End lease {number}": Ended or Terminated, and the end date (sent as `endedOn`; 400s under the field). A lease that hasn't started: "Cancel lease {number}", no date, "Keep lease" / "Cancel lease". Each valid date loads the end preview: "Void these N rent charges" (checkbox, on by default, only with money.void; else a sentence) with the list ("paid $X → becomes credit"), "Other charges after the end date" (information only), "No proration" and Balance now → after. With a deposit and money.record, an optional "Settle the deposit now" (`SettlementForm`, prefilled as a full refund; "Apply to unpaid balance" capped by the balance after the voids). Confirm sends one POST /end; `deposit.*` 400s go under the settlement fields. Toast "Lease LSE-… ended · N charges voided · deposit settled".

## LeaseEndDateModal.tsx
- `LeaseEndDateModal`: "Edit end date" (PATCH `endedOn`) on an ended or terminated lease; empty when no day is recorded; an unchanged date sends nothing.

## LeaseDeleteDialog.tsx
- `LeaseDeleteDialog`: ConfirmDialog for deleting a draft or an old lease ("Delete old lease {number}?"); 409 (e.g. it still has documents) shown inside.

## LeaseParts.tsx
- `LeaseBadge`: neutral "Old lease" badge for an old (history-only) lease, neutral "Cancelled" when `cancelledOn` is set, else the lease StatusBadge ("Expiring" when `endingSoon`). Used everywhere a lease shows (list, lease page, unit and tenant pages, tenant cards).

## Tests (`npm test`)
- `leaseEnd.test.ts`: `leaseEndDate`, `leasePeriod`, list order, not-started and editable leases, `canVoidAfterEnd`, the date rules, backend messages.
- `form.test.ts`: the pet deposit (Deposit step, prefill, sent only when changed, null when cleared, locked once ended, create body, limit).
- `term.test.ts`: `termBadge`, `termView` (active, before its start, past end, draft, ended with and without `endedOn`, early, late, cancelled, terminated, old lease).
- `stats.test.ts`: `dueState` (rent billed early isn't overdue, due today, credit) and `notDueCaption`.
- `templatePrefill.test.ts`: `templateEndDate` (2025-12-01 + 12 → 2026-11-30, month-end clamp, never over a hand-set end, follows a new start or another term while still prefilled).
- `templateOptions.test.ts`: `templateOptions` (default label, pinned and newer version, archived current on top, wizard-made templates once).
- `stats.test.ts` also covers the old-lease rules (`isOldLease`, `hasLedger`, `canDeleteLease`) and `autoRenewEditable`.
- `oldLeaseForm.test.ts`: the pet deposit, the tenant rows and their primary, `validateOldLease`, `lastOldLeaseEnd`, `oldLeaseBody`, `oldLeaseRequest`, and where backend errors go (TENANT_EMAIL_EXISTS included).
