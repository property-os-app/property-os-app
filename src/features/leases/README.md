# src/features/leases

Leases. For now the data hook and lease helpers shared by the unit drawer and the tenants page (the Leases page comes in its own step).

## keys.ts
- `leaseKeys`: `all`, `list({ propertyId?, unitId?, status? })`.
- `LeaseListParams`: the list filters.

## hooks.ts
- `useLeases({ propertyId?, unitId?, status? }, { enabled? })`: GET /leases (OWNER all, manager assigned), newest first.

## stats.ts
- `leasePeriod(lease)`: "Nov 1, 2026 to Oct 31, 2027" or null.
- `DueState`, `dueState(lease)`: credit / nothing owed / overdue / due today / next due, from `balance` and `oldestUnpaidDueDate` against UTC today (the backend's rule).
- `dueNote(state)`: the "Balance" card note. `leaseEndsNote(lease)`: "Ending soon" / "12 days left" / "Past the end date".

## LeaseParts.tsx
- `LeaseBadge`: lease StatusBadge, "Expiring" when `endingSoon`.
- `StatCard`: small drawer card (label, big value, note).
