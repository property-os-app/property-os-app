# src/features/leases

Leases. For now only the data hook (the Leases page comes in its own step).

## keys.ts
- `leaseKeys`: `all`, `list({ propertyId?, unitId?, status? })`.
- `LeaseListParams`: the list filters.

## hooks.ts
- `useLeases({ propertyId?, unitId?, status? }, { enabled? })`: GET /leases (OWNER all, manager assigned), newest first.
