# src/features/shared

Small page pieces used by more than one feature area (built only from design system components). Not domain logic.

## DetailParts.tsx

Pieces of the detail pages (`/properties/:id`, `/leases/:id`).

- `BackBreadcrumb({ parent, current, backInHistory })`: one line on top of a detail page, "[←] Parent › Current". The arrow (aria-label "Back to {Parent}", 44px on phones) and the Parent crumb go to the same place: back in history when `backInHistory` and there is an in-app entry (keeps the list's month, filters and search), else `parent.to`. The crumb is a real link (ctrl / middle click opens a new tab). Never wraps: Parent shortens with an ellipsis, Current stays whole (`aria-current="page"`). `Crumb`: `{ label, to }`.
- `Crumb`: one breadcrumb link (`label`, `to`).
- `Tile({ label, value, note, loading, className })`: KPI tile inside the header card; skeleton while `loading`.

## NoProperties.tsx
- `NoProperties({ onAdd })`: the page body when the user has no properties. With `property.create`: owner "Add your first property", manager "No properties assigned to you yet" / "Add a property (you'll manage it), or ask the owner to assign you one.", both with an Add property button that calls `onAdd`. Without it: "Ask the owner to assign you a property." Used by Dashboard, Properties, Units, Leases and Rent Roll.

## rentReminder.ts
- `rentReminderLinks(input)`: Call (tel:) and Email reminder (mailto:) links for an overdue lease: To the primary tenant, CC co-tenants, subject "Rent reminder – {property} {unit}", the reminder body (balance and due date via `format.ts`, days via `daysSince`, signed with the user's name). `tel` / `mailto` are null without a phone / email. Used by the lease page and the Rent Roll menu.
- `RentReminderInput`, `RentReminderLinks`: its types.

## ContactLink.tsx
- `ContactLink({ kind, value, wrap })`: a tenant's phone (`tel:` via `telHref`) or email (`mailto:` via `mailtoHref`) as a link to the user's own phone / email app, plus a 28px copy button (44px tap area) that shows "Phone number copied" / "Email copied" (`copyText`, works on plain http too; "Couldn't copy" info toast if both ways fail). Clicks and keys stop there, so it never opens the card or table row it sits in; `pointer-events-auto` makes it tappable inside a `ListCard`. Truncates with a tooltip, or wraps with `wrap`. Dash when empty. Used by the Tenants table, cards and drawer, the lease Tenants tab and the unit drawer.

## linkClass.ts
- `linkFocus`: rounded keyboard-only focus ring with no offset (`focus-ring-tight`), so it doesn't touch the next word. For inline links and link-style buttons.
- `textLink`: the green text link ("Back to Leases", "View all") with `linkFocus`.

## MobileFilters.tsx
Phone (under md) toolbar pieces; desktop toolbars use only the compact `SortSelect`.
- `MobileFilters({ count, resultCount, onClear, children })`: 44px "Filters" button with the active count; opens a bottom sheet (`Drawer side="bottom"`) holding `children`, with "Clear filters" and "Show N results". The count and "Clear filters" cover this page's filters only: the property (the sidebar's, app-wide) is labelled "Property (all pages)" in the sheet and is never counted or cleared.
- `SortSelect({ sort, onSortChange, options, id, compact })`: "Sort by" select for views without column headers (phones, desktop Cards view); writes the same `useClientTable` sort. `compact`: no visible label (aria-label "Sort by"), 224px wide, options read "Sort: Tenant, A to Z", for a desktop toolbar. `SortOption`: key, label, kind (labels "A to Z", "low to high", "soonest first").
- `FilterGroup({ label, children })`: a labelled block in the sheet for a control that isn't one field (status segments, a chip).

## listView.ts
- `ListView`: "cards" | "table", a main list's desktop view.
- `useListView(page, fallback)`: the saved choice (`useStoredView`, key `propertyos.{page}.view`). Used by Properties and Tenants (default Cards) and Leases, Units, Rent Roll (default Table). Phones ignore it (always cards).

## ViewToggle.tsx
- `ViewToggle({ value, onChange })`: the Cards / Table `SegmentedControl` (grid and list icons), placed at the right end of the desktop toolbar on the 5 main lists. Hidden on phones.
