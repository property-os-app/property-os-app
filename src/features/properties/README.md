# src/features/properties

Everything about properties. For now only the data hook (the Properties page comes in its own step).

## hooks.ts
- `propertyKeys`: TanStack Query keys (`["properties"]`).
- `useProperties()`: loads GET /properties (`Property[]`, newest first). Used by the property scope picker.
