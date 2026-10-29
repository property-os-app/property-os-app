# src/features/vendors

Vendors: the /vendors directory (Cards / Table views, KPIs, filters), the vendor drawer, the add / edit modal, archive and delete. GET /vendors is not scoped: Owner and every manager see all vendors; every write needs `vendors.manage` (`can(me, "vendor.manage")`, on by default). API: ../property-os-api/docs/frontend-handoff/API.md ("Vendors").

## keys.ts
- `vendorKeys`: `all`, `list`, `detail(id)`, `trades` (outside `all`).

## hooks.ts
- `useVendors()`: GET /vendors?includeArchived=true, once; the page searches and filters on the client.
- `useVendor(id, placeholder?)`: GET /vendors/:id (404 = not found), showing the list row until it answers.
- `useVendorTrades()`: GET /vendors/trades, kept 1 hour. `useTradeLabel()`: key → label (the key until loaded).
- `useCreateVendor()`, `useUpdateVendor()`, `useArchiveVendor()` (`{ id, archive }`), `useDeleteVendor()`: the writes. Each refreshes the vendor list; updates and archive also refresh expenses and tickets (they embed the vendor's name and trade). Ticket writes refresh vendors (rating, jobs, active).

## vendorText.ts
- `rateText(v)`: "$110.00 / hour", or null without a rate.
- `tradeLine(tradeLabel, v)`: "Plumbing · Downtown".
- `insuranceText(v, today?)`: "Expired Sep 15" / "Expires Oct 29" / "Valid to Mar 2027" / "No insurance on file", from the backend's `insuranceStatus` (never computed here); the year is added when it isn't this year.

## vendorStats.ts
- `vendorKpis(vendors)`: active vendors only: `total`, `trades`, `expiring`, `expired`, `none`, `activeJobs` (sum of `activeTickets`), `vendorsWithJobs`, `averageRating`, `ratingCount`. `VendorKpis`.
- `averageRating(vendors)`: every rating averaged (each vendor's `rating` weighted by `ratingCount`), 1 decimal, null when none.
- `maybeDeletable(v)`: no expense, no resolved or active ticket (cancelled tickets aren't counted on the vendor, so the server may still answer 409).
- `serviceAreas(vendors)`: the Service area filter options (once each ignoring case, A→Z).
- `VendorFilters`, `initialVendorFilters`, `matchesVendorFilters(v, f)`: trade, insurance, area (ignoring case), show inactive.
- `vendorSearchText(v, tradeLabel)`: name, contact name, trade label (the same fields as the server search).

## form.ts
- `vendorSchema`, `VendorFormInput`, `VendorFormOutput`, `VendorField`, `VENDOR_FIELDS`: rules.md "Vendors" (trimmed text ≤ 200, notes ≤ 2,000, valid email, rate amount and unit both or neither).
- `vendorDefaults(v?)`, `createVendorBody(values)` (empty fields left out), `vendorChanges(values, vendor)` (only changes, null when cleared; a rate change sends both parts).
- `vendorErrorField(message)`: "A vendor named … already exists" (also the archived one) → Name; others by their leading field name.

## VendorParts.tsx
- `VendorActions`: Edit / Archive / Unarchive / Delete handlers (omitted without vendors.manage).
- `InsuranceBadge`: `StatusBadge domain="insurance"` with `insuranceText`. `InactiveBadge`: "Inactive" for archived vendors.
- `VendorMenu`: the kebab; Delete only while `maybeDeletable`.

## VendorsPage.tsx
- `VendorsPage`: /vendors. PageHeader with "Add Vendor", 4 KPIs (Total vendors + trades, Active jobs "across N vendors", Average rating "from N ratings", Insurance expiring + expired with the no-insurance count in the note; active vendors, not the filters), toolbar (search, Trade, Insurance, Service area, Show inactive, Clear all, then Sort in Cards view and the Cards / Table `ViewToggle`, saved with `useListView("vendors", "cards")`). Search, filters, sort and page in the URL (`useClientTable` `inUrl`): `?q=&trade=&insurance=&area=&show=&sort=&page=`. Phones: search plus the "Filters" sheet. Unarchive runs from the kebab with a toast. All states.

## VendorCard.tsx
- `VendorCard`: Cards view card (3 per row from xl): avatar, name, "Trade · area", rate, kebab; contact name, phone and email (`ContactLink`); License and the insurance badge; Rating ("★ 4.7 (3)"), Jobs, Active. Archived ones muted. `VendorCardSkeleton`: its loading shape.

## VendorsTable.tsx
- `VendorsTable`: Table view (Vendor + contact, Trade, Service area, Rate, Phone, Insurance, Rating, Jobs, Active, Expenses; Vendor, Rating, Jobs and Expenses sort; kebab). On phones a `CardList` of `ListCard`s (insurance badge, Rate, Phone, Rating, email).

## VendorDrawer.tsx
- `VendorDrawer`: lg drawer. Overview (details with `ContactLink`s, rating, jobs and active tickets, added by / on; Insurance card with provider, policy number, expiry and badge), Tickets (`VendorTicketsTab`) and Expenses (GET /expenses?vendorId=, voided included, 10 per page; a manager sees only their properties'). A row goes to `/expenses?vendor=…&expense=…`, where the expense drawer opens (a drawer never opens on another). Footer with vendors.manage: Delete (unused only), Archive / Unarchive, Edit vendor. "Vendor not found" on 404.

## VendorFormModal.tsx
- `VendorFormModal({ vendor?, onSaved?, onClose })`: add / edit modal (name, trade, contact, area, phone, email, rate + per, license, insurance provider, policy number, expiry, notes). Backend messages under their field (name clash under Name) or at the top. "Discard changes?" on close.

## VendorConfirms.tsx
- `ArchiveVendorDialog({ vendor, onClose })`: "Archive {name}?" (not pickable on new expenses; existing ones keep it).
- `DeleteVendorDialog({ vendor, onClose, onDeleted? })`: "Delete {name}?" with the backend's 409 inside.

## Tests (`npm test`)
- `vendorText.test.ts`: rate text (each unit, both or neither), insurance badge text (4 statuses, year when not this year, trusts the backend status).
- `vendorStats.test.ts`: KPIs (active only, empty), service areas, filters (inactive, trade, insurance, area ignoring case).

The desktop Cards view uses the design system `CardGrid` (equal-width columns; long text never widens a card).

## VendorTicketsTab.tsx
- `VendorTicketsTab({ vendor })`: GET /maintenance-tickets?vendorId= (cancelled included, newest first, 10 per page; a manager sees only their properties'): #, ticket + location, status, rating stars, created. A row goes to `/maintenance?ticket=…`, where the ticket drawer opens.
