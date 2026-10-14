# src/features/shared

Small page pieces used by more than one feature area (built only from design system components). Not domain logic.

## DetailParts.tsx

Pieces of the detail pages (`/properties/:id`, `/leases/:id`).

- `Breadcrumb({ links, current })`: "Parent / … / Current" with router links; the last part is plain text.
- `Crumb`: one breadcrumb link (`label`, `to`).
- `Tile({ label, value, note, loading, className })`: KPI tile inside the header card; skeleton while `loading`.
