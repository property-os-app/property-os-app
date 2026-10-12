# src/features/scope

The active property scope: one property or "All properties". Shown in the Sidebar scope button and the Topbar chip. Units, Leases and Rent Roll will filter by it.

## scopeContext.ts
- `ScopeContextValue`: `propertyId` (null = all), `label`, `setPropertyId`, `openPicker`.
- `ScopeContext`: the React context.
- `useScope()`: reads the scope; throws outside `ScopeProvider`.

## ScopeProvider.tsx
- `ScopeProvider`: loads GET /properties, keeps the chosen id (saved in localStorage), falls back to All properties when the saved id is no longer in the list, and renders the "Choose property" modal. Mounted by `AppLayout`.

## ScopeModal.tsx
- `ScopeModal`: Modal "Choose property" with "All properties" and one row per property (name, city and state), the current one marked. Handles loading, error (Retry) and empty states.

## scopeStorage.ts
- `readSavedScope()` / `saveScope(id)` / `clearSavedScope()`: localStorage access wrapped in try/catch. `clearSavedScope` runs on sign out.
