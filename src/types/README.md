# src/types

TypeScript types for API responses. Each one is copied from docs/API.md (and checked against docs/api-samples when samples exist). No logic here.

## auth.ts
- `UserRole`: `OWNER | PROPERTY_MANAGER | TENANT`.
- `Me`: the AuthUser returned by GET /auth/me (`phone` can be null; `firebaseUid` is never returned).
- `AuthErrorCode`: the 5 values of `ApiError.code`. Only auth errors have a code.

## property.ts
- `PropertyType`: `RESIDENTIAL | COMMERCIAL | MIXED_USE`.
- `Property`: one row from GET /properties (`propertyValue` is a money string, `acquisitionDate` is a full timestamp).
- `PropertyCreateBody`: POST /properties body. `PropertyUpdateBody`: PATCH body (any subset, `description` may be null).

## manager.ts
- `ManagerSummary`: `{ id, email, name }` (property managers list, assign / unassign answers).
- `ManagerListItem`: `ManagerSummary` + `assignedPropertyCount` (GET /managers).

## unit.ts
- `UnitType`, `UnitStatus`: unit enums.
- `Unit`: one row from GET /units (`monthlyRent` is a money string, `floorArea` a number).

## lease.ts
- `LeaseStatus`, `SignatureStatus`, `PaymentFrequency`: lease enums.
- `LeaseTenant`: one tenant on a lease (`isPrimary`).
- `Lease`: one row from GET /leases (dates "YYYY-MM-DD", money strings, `endingSoon`, `balance`).
