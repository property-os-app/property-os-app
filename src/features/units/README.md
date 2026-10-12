# src/features/units

Units. For now only the data hook (the Units page comes in its own step).

## keys.ts
- `unitKeys`: `all`, `list({ propertyId? })`.

## hooks.ts
- `useUnits({ propertyId? })`: GET /units (OWNER all, manager assigned). An unknown propertyId gives `[]`.
