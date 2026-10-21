# src/features/shared

Small page pieces used by more than one feature area (built only from design system components). Not domain logic.

## DetailParts.tsx

Pieces of the detail pages (`/properties/:id`, `/leases/:id`).

- `Breadcrumb({ links, current })`: "Parent / … / Current" with router links (`linkFocus` ring); the last part is plain text.
- `Crumb`: one breadcrumb link (`label`, `to`).
- `Tile({ label, value, note, loading, className })`: KPI tile inside the header card; skeleton while `loading`.

## NoProperties.tsx
- `NoProperties({ onAdd })`: the page body when the user has no properties. Manager: "No properties assigned to you yet" / "Ask the owner to assign you a property." Owner: "Add your first property" with an Add property button (`property.create`) that calls `onAdd`. Used by Dashboard, Properties, Units, Leases and Rent Roll.

## linkClass.ts
- `linkFocus`: rounded keyboard-only focus ring with no offset (`focus-ring-tight`), so it doesn't touch the next word. For inline links and link-style buttons.
- `textLink`: the green text link ("Back to Leases", "View all") with `linkFocus`.

## MobileFilters.tsx
Phone (under md) toolbar pieces. Desktop toolbars don't use them.
- `MobileFilters({ count, resultCount, onClear, children })`: 44px "Filters" button with the active count; opens a bottom sheet (`Drawer side="bottom"`) holding `children`, with "Clear filters" and "Show N results".
- `SortSelect({ sort, onSortChange, options, id })`: "Sort by" select (phones have no column headers); writes the same `useClientTable` sort. `SortOption`: key, label, kind (labels "A to Z", "low to high", "soonest first").
- `FilterGroup({ label, children })`: a labelled block in the sheet for a control that isn't one field (status segments, a chip).
