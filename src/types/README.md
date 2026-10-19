# src/types

TypeScript types for API responses. Each one is copied from ../property-os-api/docs/frontend-handoff/API.md section 4. ../property-os-api/docs/frontend-handoff/api-samples does not exist yet (samples come later from the backend's capture script): when they arrive, check these types against them. No logic here.

## auth.ts
- `UserRole`: `OWNER | PROPERTY_MANAGER | TENANT`.
- `Me`: the AuthUser returned by GET /auth/me (`phone` can be null; `firebaseUid` is never returned).
- `AuthErrorCode`: the 5 values of `ApiError.code`. Only auth errors have a code.

## property.ts
- `PropertyType`: `RESIDENTIAL | COMMERCIAL | MIXED_USE`.
- `Property`: every Property endpoint (`propertyValue` is a money string like "250000.00", `acquisitionDate` a full timestamp, `unitCount`, `managers`).
- `PropertyManagerRef`: `{ id, name }`, one embedded manager (no email).
- `PropertyCreateBody`: POST /properties body. `PropertyUpdateBody`: PATCH body (any subset, `description` may be null).

## manager.ts
- `ManagerSummary`: `{ id, email, name }` (property managers list, assign / unassign answers).
- `ManagerListItem`: `ManagerSummary` + `assignedPropertyCount` (GET /managers).

## unit.ts
- `UnitType`, `UnitStatus`: unit enums.
- `Unit`: one row from GET /units (`monthlyRent` is a money string like "1200.00", `floorArea` a number).
- `UnitCreateBody`: POST /units body (never `OCCUPIED`). `UnitUpdateBody`: PATCH body (no `propertyId`; `floor`, `bathrooms`, `description` may be null).

## tenant.ts
- `TenantType`, `ContactMethod`: tenant enums.
- `Tenant`: POST / PATCH answer (no `createdBy`; `moveInDate` is a full timestamp).
- `TenantCreatedBy`, `TenantDetail`: GET /tenants/:id (with `idNumber` and `createdBy`).
- `TenantListItem`: one row of GET /tenants (no `idNumber`).
- `TenantCreateBody`: POST body. `TenantUpdateBody`: PATCH body (`idNumber`, `address`, `moveInDate`, `notes` may be null).

## lease.ts
- `LeaseStatus`, `SignatureStatus`, `PaymentFrequency`: lease enums.
- `LeaseTenant`: one tenant on a lease (`isPrimary`).
- `Lease`: one row from GET /leases (dates "YYYY-MM-DD", money strings with 2 decimals, `tenants` primary first then by name, `endingSoon`, `balance`).
- `LeaseCreateBody`: POST /leases body (only `unitId` required; `status` DRAFT or ACTIVE). `LeaseUpdateBody`: PATCH body (never `status`; dates, rent, deposit, rentDueDay, notes, primaryTenantId may be null). `LeaseEndBody`: `{ status?: ENDED | TERMINATED }`.

## ledger.ts
- `ChargeType`, `PaymentMethod`, `LedgerEntryKind`: money enums.
- `Charge`, `Payment`: POST charge / payment answers (money strings, "YYYY-MM-DD" dates, void fields).
- `LedgerEntry`, `LedgerResponse`: GET /leases/:id/ledger (entries oldest first; `runningBalance` may be negative; summary with balance, totals, monthly rent).
- `ChargeCreateBody` (`periodMonth` only on RENT), `PaymentCreateBody`, `VoidBody` (`reason`): request bodies.

## rentRoll.ts
- `RentRollStatus`: `PAID | PARTIAL | UNPAID | OVERDUE | NOT_BILLED`.
- `RentRollRow`, `RentRollResponse`: GET /rent-roll (rows with `openingBalance`, `charged`, `paid`, `balance`, plus a summary that ignores status and search).
- `GenerateRentResponse`: POST /rent-roll/generate counts.
