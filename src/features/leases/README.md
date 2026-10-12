# src/features/leases

Leases. For now only the data hook (the Leases page comes in its own step).

## keys.ts
- `leaseKeys`: `all`, `list({ propertyId?, status? })`.

## hooks.ts
- `useLeases({ propertyId?, status? })`: GET /leases (OWNER all, manager assigned), newest first.
