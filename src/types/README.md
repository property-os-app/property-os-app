# src/types

TypeScript types for API responses. Each one is copied from ../property-os-api/docs/frontend-handoff/API.md section 4. ../property-os-api/docs/frontend-handoff/api-samples does not exist yet (samples come later from the backend's capture script): when they arrive, check these types against them. No logic here.

## auth.ts
- `UserRole`: `OWNER | PROPERTY_MANAGER | TENANT`.
- `Me`: the AuthUser returned by GET /auth/me (`phone` can be null; `firebaseUid` is never returned; `permissions`: every key for OWNER, the granted keys for a manager, `[]` for TENANT).
- `PermissionCatalogItem`: one GET /settings/permissions item (`key`, `label`, `group`, `default`).
- `AuthErrorCode`: the 6 values of `ApiError.code`, `FORBIDDEN_PERMISSION` included. Only auth errors have a code.

## property.ts
- `PropertyType`: `RESIDENTIAL | COMMERCIAL | MIXED_USE`.
- `Property`: every Property endpoint (`propertyValue` is a money string like "250000.00", `acquisitionDate` a "YYYY-MM-DD" date, `unitCount`, `managers`).
- `PropertyManagerRef`: `{ id, name }`, one embedded manager (no email).
- `PropertyCreateBody`: POST /properties body. `PropertyUpdateBody`: PATCH body (any subset, `description` may be null).

## manager.ts
- `ManagerSummary`: `{ id, email, name }` (property managers list, assign / unassign answers).
- `ManagerListItem`: `ManagerSummary` + `assignedPropertyCount` (GET /managers).
- `ManagerAccess`: GET / PUT /managers/:userId/access (`userId`, `permissions`, `propertyIds`). `ManagerAccessBody`: the PUT body (both full lists).

## unit.ts
- `UnitType`, `UnitStatus`: unit enums.
- `Unit`: one row from GET /units (`monthlyRent` is a money string like "1200.00", `floorArea` a number).
- `UnitCreateBody`: POST /units body (never `OCCUPIED`). `UnitUpdateBody`: PATCH body (no `propertyId`; `floor`, `bathrooms`, `description` may be null).

## tenant.ts
- `TenantType`, `ContactMethod`: tenant enums.
- `Tenant`: POST / PATCH answer (no `createdBy`; `moveInDate` is a "YYYY-MM-DD" date or null).
- `TenantCreatedBy`, `TenantDetail`: GET /tenants/:id (with `idNumber` and `createdBy`).
- `TenantListItem`: one row of GET /tenants (no `idNumber`).
- `TenantCreateBody`: POST body. `TenantUpdateBody`: PATCH body (`idNumber`, `address`, `moveInDate`, `notes` may be null).

## lease.ts
- `LeaseStatus`, `SignatureStatus`, `PaymentFrequency`: lease enums.
- `LeaseTenant`: one tenant on a lease (`isPrimary`).
- `Lease`: one row from GET /leases (dates "YYYY-MM-DD", money strings with 2 decimals, `tenants` primary first then by name, `endingSoon`, `balance`, `templateVersionId`, `template`).
- `LeaseTemplateRef`: the lease's embedded template `{ id, name, version, archived }`; `version` is the pinned one.
- `LeaseCreateBody`: POST /leases body (only `unitId` required; `status` DRAFT or ACTIVE). `LeaseUpdateBody`: PATCH body (never `status`; dates, rent, deposit, rentDueDay, notes, primaryTenantId, templateId may be null). Both take `templateId`. `LeaseEndBody`: `{ status?: ENDED | TERMINATED }`.

## leaseTemplate.ts
- `LeaseTemplateListItem`: one row of GET /lease-templates (`defaultTermMonths`, `isDefault`, `archivedAt`, `currentVersion`, `leaseCount`).
- `LeaseTemplateDetail`: GET /lease-templates/:id and every template write (adds `currentVersionId`, `body` in Markdown, `versions` newest first).
- `LeaseTemplateVersionSummary`: one history entry (`version`, `createdAt`, `createdBy`, `leaseCount`). `LeaseTemplateVersion`: one version with its `body`.
- `MergeField`: one GET /lease-templates/merge-fields item (`key`, `group`, `label`, `sample`).
- `LeaseTemplateCreateBody`: POST body. `LeaseTemplateUpdateBody`: PATCH body (details only; `description`, `defaultTermMonths` may be null).

## ledger.ts
- `ChargeType`, `PaymentMethod`, `LedgerEntryKind`: money enums.
- `Charge`, `Payment`: POST charge / payment answers (money strings, "YYYY-MM-DD" dates, void fields).
- `LedgerEntry`, `LedgerResponse`: GET /leases/:id/ledger (entries oldest first; `runningBalance` may be negative; summary with balance, totals, monthly rent).
- `ChargeCreateBody` (`periodMonth` only on RENT), `PaymentCreateBody`, `VoidBody` (`reason`): request bodies.

## rentRoll.ts
- `RentRollStatus`: `PAID | PARTIAL | UNPAID | OVERDUE | NOT_BILLED`.
- `RentRollRow`, `RentRollResponse`: GET /rent-roll (rows with `openingBalance`, `charged`, `paid`, `balance`, plus a summary that ignores status and search).
- `GenerateRentResponse`: POST /rent-roll/generate counts.

## vendor.ts
- `VendorRateUnit` (`HOUR | VISIT | MONTH | JOB`), `VendorInsuranceStatus` (`NONE | EXPIRED | EXPIRING | VALID`, computed by the server).
- `Vendor`: GET /vendors rows, GET /vendors/:id and every vendor write (`rateAmount` money string with `rateUnit`, `insuranceExpiresOn` "YYYY-MM-DD", `archivedAt`, `expenseCount`, ticket stats `rating` (1 decimal or null), `ratingCount`, `jobsCount`, `activeTickets`, `createdBy`).
- `VendorTrade`: one GET /vendors/trades item (`key`, `label`).
- `VendorCreateBody`, `VendorUpdateBody`: request bodies (`rateAmount` is a number; PATCH clears with null, except name and trade).

## expense.ts
- `ExpenseType` (`OPERATING | CAPITAL`), `ExpenseStatus` (`PENDING_APPROVAL | APPROVED | REJECTED`; voiding is the `voided` flag).
- `Expense`: one expense (money string `amount`, "YYYY-MM-DD" `date`, `property` / `unit` / `vendor` refs or null (no property = portfolio-wide), `maintenanceTicket` (`{ id, ticketNumber, title }` or null: recorded by a ticket's resolve), approved / rejected / voided by and at, `rejectionReason`, `voidReason`, `allowedActions` for the caller).
- `ExpenseAllowedActions`: `{ edit, approve, reject, void, delete }`.
- `ExpenseList`: GET /expenses page (`items`, `page`, `pageSize`, `totalItems`, `totalPages`, `totals` over every matching row).
- `ExpenseSummary`, `CategoryTotal`: GET /expenses/summary (total, previous period, `changePercent` or null, average monthly, largest category, pending ignoring dates, by category).
- `ExpenseCategory`: one GET /expenses/categories item (`key`, `label`, `defaultType`).
- `ExpenseListQuery` (incl. `maintenanceTicketId`), `ExpenseSummaryQuery`: the query params (type aliases, so they fit `apiFetch`'s `query`).
- `ExpenseCreateBody`, `ExpenseUpdateBody`: request bodies (`amount` is a number; no / null `propertyId` = portfolio-wide).

## maintenance.ts
- `MaintenancePriority` (`EMERGENCY | URGENT | NORMAL | LOW`), `MaintenanceStatus` (`OPEN | ASSIGNED | IN_PROGRESS | RESOLVED | CANCELLED`).
- `MaintenanceTicket`: one ticket (`ticketNumber` number, `property` / `unit` / `vendor` refs, `locationNote`, timestamps, money strings `estimatedCost` / `actualCost`, linked `expenses`, resolution and cancel fields, `sla { hours, dueAt, pastSla }`, `allowedActions`). `TicketExpense`: one linked expense. `TicketAllowedActions`.
- `TicketList`: GET /maintenance-tickets page with `statusCounts` (`TicketStatusCounts`: all 5 statuses, ignoring the status filter). `TicketSummary`: GET /maintenance-tickets/summary.
- `TicketListQuery`, `TicketSummaryQuery`: the query params. `TicketCreateBody`, `TicketUpdateBody`, `TicketResolveBody`: request bodies (money as numbers).
