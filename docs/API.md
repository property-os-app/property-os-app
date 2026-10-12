# Property OS API: frontend reference

Generated from the code on branch `dev` (2026-10-12): controllers, DTOs,
services, guards, `prisma/schema.prisma` and the hand-written SQL indexes in
`prisma/migrations/`. Anything the code does not settle is marked
**UNCLEAR:**.

Contents:

1. [Conventions](#1-conventions)
2. [Enums](#2-enums)
3. [Role matrix](#3-role-matrix)
4. [Response shapes](#4-response-shapes)
5. [Endpoints](#5-endpoints)
6. [Shapes returned by POST, PATCH and DELETE](#6-shapes-returned-by-post-patch-and-delete)
7. [Not in admin MVP / planned, not built](#7-not-in-admin-mvp--planned-not-built)

---

## 1. Conventions

### Base URL and CORS

- Port `PORT` env var, default `3000`. No global route prefix (paths below are
  used as written, e.g. `GET http://localhost:3000/properties`).
- CORS origins come from `CORS_ORIGINS` (comma-separated), default
  `http://localhost:5173`. Allowed methods: `GET, POST, PATCH, DELETE,
  OPTIONS`. Allowed headers: `Content-Type`, `Authorization`. No cookies
  (`credentials: false`).
- Request bodies are JSON (`Content-Type: application/json`).

### Auth header

Every endpoint except `GET /health` needs:

```
Authorization: Bearer <Firebase ID token>
```

The scheme must be exactly `Bearer` (case-sensitive) followed by one space and
the token. The token's `email_verified` claim must be `true`.

Order of checks on every protected request: **auth guard (401/403) → role
guard (403) → body/query validation (400) → service rules (400/403/404/409)**.
So a wrong role always wins over a bad body.

### Error body

All errors are JSON:

```json
{ "statusCode": 404, "message": "Lease clx… not found", "error": "Not Found" }
```

| Field | Type | Notes |
|---|---|---|
| `statusCode` | number | Same as the HTTP status. |
| `message` | `string` or `string[]` | **Array** for DTO validation errors (400 from the ValidationPipe), one string per failed rule. Order of the array is not guaranteed. **String** for everything else. |
| `error` | string | HTTP reason phrase: `"Bad Request"`, `"Unauthorized"`, `"Forbidden"`, `"Not Found"`, `"Conflict"`. Missing on 500. |
| `code` | string | **Only on auth errors** (the 5 below). Never present elsewhere. |

Auth error codes (from `src/auth/auth-error-codes.ts`):

| Case | Status | `code` | `message` |
|---|---|---|---|
| No `Authorization: Bearer <token>` header | 401 | `MISSING_TOKEN` | `Missing bearer token` |
| Token fails Firebase verification (invalid, expired, revoked, wrong project) | 401 | `INVALID_TOKEN` | `Invalid or expired token` |
| Token's email not verified | 403 | `EMAIL_NOT_VERIFIED` | `Email not verified` |
| Valid token but no `User` row (not registered yet) | 401 | `USER_NOT_REGISTERED` | `No matching user found for this token` |
| Role not allowed on this endpoint | 403 | `FORBIDDEN_ROLE` | `You do not have permission to access this resource` |

These run in table order: an unverified email gets 403 even when no `User`
row exists. `POST /auth/register` can only return the first three.

Other errors every endpoint can return:

| Status | Body | When |
|---|---|---|
| 400 | `{ statusCode, message: string, error: "Bad Request" }` | Malformed JSON body. **UNCLEAR:** the exact `message` comes from the Express body parser, not from this code. |
| 404 | `{ statusCode: 404, message: "Cannot GET /foo", error: "Not Found" }` | Unknown route (Nest default; method and path vary). |
| 500 | `{ statusCode: 500, message: "Internal server error" }` | Any unhandled error (no `error` field). See the cases in section 5 marked "500". |

Unknown body fields are **silently dropped** (`whitelist: true`, no
`forbidNonWhitelisted`). Two exceptions are rejected with 400 on purpose:
`status` on `PATCH /leases/:id` and `propertyId` on `PATCH /units/:id`.

### Money

- **In:** JSON numbers (not strings; `"1200"` fails with
  `<field> must be a number conforming to the specified constraints`), at most
  2 decimal places. Limits are per field (section 5).
- **Out:** always strings. Two formats exist:
  - **Fixed 2 decimals** (`"1200.00"`, `"-50.00"`): every money field built by
    the ledger code: lease `balance`, all charge/payment `amount`s, ledger,
    rent roll.
  - **Raw Prisma Decimal** (trailing zeros dropped: `"1200"`, `"1200.5"`):
    `Property.propertyValue`, `Unit.monthlyRent`, `Lease.rent`,
    `Lease.deposit`, `Lease.lateFeeAmount`. Parse them as decimals; do not
    compare the strings.
- Values that can be **negative**: `balance` everywhere (negative = credit,
  overpaid) and ledger `runningBalance`. Rent roll `outstandingBalance` only
  sums positive balances, so it is never negative.
- Balances are calculated on read from non-voided charges and payments, never
  stored.

### Dates and times

| Format | Example | Fields |
|---|---|---|
| Date only `"YYYY-MM-DD"` (in and out) | `"2026-10-01"` | Lease `startDate`, `endDate`; Charge `dueDate`; Payment `paymentDate`; lease/ledger/rent-roll `oldestUnpaidDueDate`; ledger entry `date`; rent roll `dueDate`, `lastPaymentDate` |
| ISO timestamp (UTC, out) | `"2026-10-12T08:30:00.000Z"` | Every `createdAt`, `updatedAt`; Charge/Payment `voidedAt`; `Property.acquisitionDate`; `Tenant.moveInDate`; `/health` `timestamp` |

Date-only inputs are strict: exactly `YYYY-MM-DD` and a real calendar day
(`2026-02-30` is rejected). Error message:
`<field> must be a real calendar date in YYYY-MM-DD format`.

`Property.acquisitionDate` and `Tenant.moveInDate` are different: they are
full timestamps and accept anything JavaScript's `new Date(value)` can parse.
Send `"YYYY-MM-DD"`: it is stored as UTC midnight and comes back as
`"YYYY-MM-DDT00:00:00.000Z"`. Error message: `<field> must be a Date instance`.

"Today", "this month" and the year in generated numbers all use **UTC**.

### Months

`"YYYY-MM"` with month `01`–`12` (`/^\d{4}-(0[1-9]|1[0-2])$/`). Used by
`Charge.periodMonth`, rent roll `month` (query and response) and
`POST /rent-roll/generate`. Error message (rent roll):
`month must be a month in YYYY-MM format`.

### IDs

All ids are Prisma `cuid()` strings (e.g. `"cmg2x8k1q0000abcd1234efgh"`). The
API never validates their format: an id that doesn't exist (or isn't visible
to you) returns 404 with the message for that resource.

Human-readable numbers, generated by the server (never accepted from the
client):

| Field | Format | Example |
|---|---|---|
| `Lease.leaseNumber` | `LSE-{UTC year}-{seq padded to 3}` | `LSE-2026-001` |
| `Charge.invoiceNumber` | `INV-{UTC year}-{seq padded to 4}` | `INV-2026-0001` |
| `Payment.paymentNumber` | `PMT-{UTC year}-{seq padded to 4}` | `PMT-2026-0001` |

The sequence restarts each year, is the highest existing number + 1 (deleted
draft leases don't free a number), and grows past the padding (`LSE-2026-1000`).

### null vs missing

Every field of a response shape is always present. Optional values come back
as `null`, never omitted. Nullable fields are listed per shape in section 4.

### Sorting (no query parameter changes it)

| List | Order |
|---|---|
| `GET /properties` | `createdAt` newest first |
| `GET /auth/my-properties` | Database order (no `orderBy` in the code). Not in admin MVP; use `GET /properties` |
| `GET /properties/:propertyId/managers` | Assignment date, oldest first |
| `GET /managers` | `email` A→Z |
| `GET /managers/:userId` → `properties` | Property `name` A→Z |
| `GET /units` | `propertyId` A→Z, then `unitNumber` as **text** A→Z (`"10"` before `"2"`) |
| `GET /tenants` | `createdAt` newest first |
| `GET /leases` | `createdAt` newest first |
| Lease `tenants` array | Primary tenant first. **UNCLEAR:** order of co-tenants is not set |
| `GET /leases/tag-suggestions` | The 6 default tags in fixed order, then tags used on visible leases A→Z; case-insensitive duplicates removed (first spelling wins) |
| `GET /leases/:id/ledger` → `entries` | Date oldest first; on the same day charges before payments; then creation time |
| `GET /rent-roll` → `rows` | Property `name` A→Z, then `unitNumber` numeric-aware (`"2"` before `"10"`), then `leaseNumber` |

### Pagination

None. Every list returns all matching rows.

### Status codes on success

- `GET`, `PATCH`, `DELETE`: 200.
- `POST` that creates something: 201 (`/auth/register`, `/properties`,
  `/properties/:id/managers`, `/units`, `/tenants`, `/leases`,
  `/leases/:id/charges`, `/leases/:id/payments`, `/rent-roll/generate`).
- `POST` actions on an existing record: 200 (`/leases/:id/activate`,
  `/leases/:id/end`, `.../charges/:chargeId/void`, `.../payments/:paymentId/void`).
- No endpoint returns 204. Every `DELETE` returns the deleted record (section 6).

### Validation message templates

The default class-validator messages you will see (with the field name in
front):

| Rule | Message |
|---|---|
| required / not empty | `<field> should not be empty` |
| string | `<field> must be a string` |
| number (also: more than 2 decimals) | `<field> must be a number conforming to the specified constraints` |
| integer | `<field> must be an integer number` |
| positive | `<field> must be a positive number` |
| min / max | `<field> must not be less than <n>` / `<field> must not be greater than <n>` |
| max length | `<field> must be shorter than or equal to <n> characters` |
| boolean | `<field> must be a boolean value` |
| email | `<field> must be an email` |
| array | `<field> must be an array` |
| array max size | `<field> must contain no more than <n> elements` |
| array unique | `All <field>'s elements must be unique` |
| each item (arrays) | `each value in <field> must be a string` / `each value in <field> should not be empty` |
| timestamp date | `<field> must be a Date instance` |

Custom messages are quoted per field in section 5. A missing required field
usually produces several messages at once (e.g. `["name should not be empty",
"name must be a string"]`).

`null` counts as "not sent" for optional fields. Send `null` only where
section 5 says it clears a value: on other optional fields it can cause a 500
(see the "null" notes per endpoint).

---

## 2. Enums

| Enum | Values | Used by |
|---|---|---|
| `UserRole` | `OWNER`, `PROPERTY_MANAGER`, `TENANT` | `User.role` |
| `PropertyType` | `RESIDENTIAL`, `COMMERCIAL`, `MIXED_USE` | `Property.propertyType` |
| `UnitType` | `STUDIO`, `ONE_BED`, `TWO_BED`, `THREE_BED`, `FOUR_BED` | `Unit.unitType` |
| `UnitStatus` | `VACANT`, `OCCUPIED`, `RESERVED`, `UNDER_MAINTENANCE` | `Unit.status` |
| `TenantType` | `INDIVIDUAL`, `COMPANY` | `Tenant.tenantType` |
| `ContactMethod` | `EMAIL`, `PHONE`, `SMS` | `Tenant.preferredContactMethod` |
| `LeaseStatus` | `DRAFT`, `ACTIVE`, `ENDED`, `TERMINATED` | `Lease.status` |
| `SignatureStatus` | `NOT_SENT`, `PENDING`, `SIGNED` | `Lease.signatureStatus` (stored only; no e-sign integration) |
| `PaymentFrequency` | `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY` | `Lease.paymentFrequency` (only `MONTHLY` gets generated rent) |
| `PaymentMethod` | `ACH`, `CHECK`, `CREDIT_CARD`, `CASH`, `OTHER` | `Payment.method` |
| `ChargeType` | `RENT`, `LATE_FEE`, `OTHER` | `Charge.type` |
| Rent roll status (not a DB enum) | `PAID`, `PARTIAL`, `UNPAID`, `OVERDUE`, `NOT_BILLED` | rent roll `rows[].status` and `?status=` |
| Ledger entry kind (not a DB enum) | `CHARGE`, `PAYMENT` | ledger `entries[].kind` |

---

## 3. Role matrix

Legend: **✅** allowed · **✅ assigned** allowed only for properties the
manager is assigned to (lists show only those) · **404** out of scope returns
404 (same as "doesn't exist") · **403** blocked with `FORBIDDEN_ROLE` ·
**403\*** out of scope returns 403 `You do not have access to this property`
(not `FORBIDDEN_ROLE`).

| Endpoint | OWNER | PROPERTY_MANAGER | TENANT |
|---|---|---|---|
| `GET /health` | ✅ (no auth) | ✅ (no auth) | ✅ (no auth) |
| `POST /auth/register` | ✅ (no `User` row yet) | ✅ (no `User` row yet) | ✅ (no `User` row yet) |
| `GET /auth/me` | ✅ | ✅ | ✅ |
| `GET /auth/my-properties` | ✅ all | ✅ assigned | 403 |
| `POST /properties` | ✅ | 403 | 403 |
| `GET /properties` | ✅ all | ✅ assigned | 403 |
| `GET /properties/:id` | ✅ | ✅ assigned, else 404 | 403 |
| `PATCH /properties/:id` | ✅ | 403 | 403 |
| `DELETE /properties/:id` | ✅ | 403 | 403 |
| `GET /properties/:propertyId/managers` | ✅ | ✅ assigned, else 404 | 403 |
| `POST /properties/:propertyId/managers` | ✅ | 403 | 403 |
| `DELETE /properties/:propertyId/managers/:userId` | ✅ | 403 | 403 |
| `GET /managers` | ✅ | 403 | 403 |
| `GET /managers/:userId` | ✅ | 403 | 403 |
| `POST /units` | ✅ | ✅ assigned, else 403\* | 403 |
| `GET /units` | ✅ all | ✅ assigned | 403 |
| `GET /units/:id` | ✅ | ✅ assigned, else 404 | 403 |
| `PATCH /units/:id` | ✅ | ✅ assigned, else 403\* | 403 |
| `DELETE /units/:id` | ✅ | 403 | 403 |
| `POST /tenants` | ✅ | ✅ (all tenants, no scoping) | 403 |
| `GET /tenants` | ✅ | ✅ all | 403 |
| `GET /tenants/:id` | ✅ | ✅ all | 403 |
| `PATCH /tenants/:id` | ✅ | ✅ all | 403 |
| `DELETE /tenants/:id` | ✅ | 403 | 403 |
| `POST /leases` | ✅ | ✅ unit on assigned property, else 403\* | 403 |
| `GET /leases` | ✅ all | ✅ assigned | 403 |
| `GET /leases/tag-suggestions` | ✅ | ✅ (tags from assigned leases) | 403 |
| `GET /leases/:id` | ✅ | ✅ assigned, else 404 | 403 |
| `PATCH /leases/:id` | ✅ | ✅ assigned, else 404 (moving to an unassigned unit: 403\*) | 403 |
| `POST /leases/:id/activate` | ✅ | ✅ assigned, else 404 | 403 |
| `POST /leases/:id/end` | ✅ | ✅ assigned, else 404 | 403 |
| `DELETE /leases/:id` | ✅ | ✅ assigned, else 404 | 403 |
| `GET /leases/:id/ledger` | ✅ | ✅ assigned, else 404 | 403 |
| `POST /leases/:id/charges` | ✅ | ✅ assigned, else 404 | 403 |
| `POST /leases/:id/charges/:chargeId/void` | ✅ | 403 | 403 |
| `POST /leases/:id/payments` | ✅ | ✅ assigned, else 404 | 403 |
| `POST /leases/:id/payments/:paymentId/void` | ✅ | 403 | 403 |
| `GET /rent-roll` | ✅ all | ✅ assigned | 403 |
| `POST /rent-roll/generate` | ✅ all | ✅ assigned | 403 |

"Assigned" means a `PropertyManager` row links the manager to the property.
For units it is the unit's property; for leases, charges, payments and the
ledger it is the property of the lease's unit.

Tenants are people, not tied to a property: every manager sees and edits every
tenant. This is intentional.

A TENANT can only call `/auth/me` (and `/auth/register` once). There is no
tenant portal yet.

---

## 4. Response shapes

Types: `string`, `number`, `boolean`, `money` (string, see 1), `date`
(`"YYYY-MM-DD"`), `timestamp` (ISO UTC), `| null` = nullable.

### AuthUser

| Field | Type |
|---|---|
| `id` | string |
| `email` | string |
| `name` | string |
| `phone` | string \| null |
| `role` | `UserRole` |
| `createdAt`, `updatedAt` | timestamp |

`firebaseUid` is never returned.

### Property

| Field | Type |
|---|---|
| `id` | string |
| `name`, `street`, `city`, `state`, `zip` | string |
| `propertyType` | `PropertyType` |
| `propertyValue` | money (raw Decimal, e.g. `"250000"`) |
| `acquisitionDate` | timestamp |
| `description` | string \| null |
| `createdAt`, `updatedAt` | timestamp |

No managers, units or counts are embedded.

### ManagerSummary

`{ id: string, email: string, name: string }`

### ManagerListItem

`ManagerSummary` + `assignedPropertyCount: number`.

### ManagerDetail

| Field | Type |
|---|---|
| `id`, `email`, `name` | string |
| `phone` | string \| null |
| `properties` | `{ id: string, name: string, city: string, state: string }[]` |

### Unit

| Field | Type |
|---|---|
| `id` | string |
| `propertyId` | string |
| `unitNumber` | string |
| `unitType` | `UnitType` |
| `floorArea` | number (float) |
| `floor` | number (integer) \| null |
| `bathrooms` | number (integer) \| null |
| `monthlyRent` | money (raw Decimal) |
| `status` | `UnitStatus` |
| `description` | string \| null |
| `createdAt`, `updatedAt` | timestamp |

No property or lease is embedded.

### Tenant (returned by POST and PATCH)

| Field | Type |
|---|---|
| `id` | string |
| `userId` | string \| null (set only for self-registered tenants) |
| `fullName` | string |
| `email` | string (always lowercase) |
| `phone` | string |
| `idNumber` | string \| null |
| `address` | string \| null |
| `tenantType` | `TenantType` |
| `moveInDate` | timestamp \| null |
| `preferredContactMethod` | `ContactMethod` |
| `notes` | string \| null |
| `createdById` | string |
| `createdAt`, `updatedAt` | timestamp |

### TenantDetail (`GET /tenants/:id`)

`Tenant` + `createdBy: { id: string, email: string, role: UserRole }`.

### TenantListItem (`GET /tenants`)

`TenantDetail` **without `idNumber`**.

### Lease (`LeaseResponse`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `leaseNumber` | string | `LSE-YYYY-NNN` |
| `unitId` | string | |
| `status` | `LeaseStatus` | |
| `signatureStatus` | `SignatureStatus` | |
| `startDate`, `endDate` | date \| null | null only on DRAFT |
| `paymentFrequency` | `PaymentFrequency` | |
| `rent`, `deposit` | money (raw Decimal) \| null | null only on DRAFT |
| `lateFeeAmount` | money (raw Decimal) | default `"0"` |
| `lateFeeGraceDays` | number | default `5` |
| `rentDueDay` | number \| null | 1–31; null only on DRAFT |
| `autoRenew` | boolean | flag only, nothing renews automatically |
| `tags` | string[] | default `[]` |
| `notes` | string \| null | |
| `createdById` | string | |
| `createdAt`, `updatedAt` | timestamp | |
| `unit` | `{ id, unitNumber, property: { id, name } }` | |
| `tenants` | `{ id, fullName, email, isPrimary: boolean }[]` | primary first; `[]` when none |
| `termMonths` | number \| null | whole months, end date inclusive (`2026-01-01`→`2026-12-31` = 12); null if a date is missing |
| `endingSoon` | boolean | `ACTIVE` and `endDate` between today and today + 30 days (UTC, inclusive) |
| `balance` | money (fixed 2) | all non-voided charges − all non-voided payments, **all time** (includes charges due in the future); negative = credit |
| `oldestUnpaidDueDate` | date \| null | due date of the oldest charge not covered by payments (payments applied oldest charge first); may be in the future |

### Charge (`ChargeResponse`)

| Field | Type |
|---|---|
| `id` | string |
| `invoiceNumber` | string (`INV-YYYY-NNNN`) |
| `leaseId` | string |
| `type` | `ChargeType` |
| `description` | string |
| `amount` | money (fixed 2) |
| `dueDate` | date |
| `periodMonth` | `"YYYY-MM"` \| null (RENT charges only) |
| `voided` | boolean |
| `voidedAt` | timestamp \| null |
| `voidedById` | string \| null |
| `voidReason` | string \| null |
| `createdById` | string |
| `createdAt`, `updatedAt` | timestamp |

### Payment (`PaymentResponse`)

| Field | Type |
|---|---|
| `id` | string |
| `paymentNumber` | string (`PMT-YYYY-NNNN`) |
| `leaseId` | string |
| `amount` | money (fixed 2) |
| `method` | `PaymentMethod` |
| `paymentDate` | date |
| `referenceNumber` | string \| null |
| `notes` | string \| null |
| `voided` | boolean |
| `voidedAt` | timestamp \| null |
| `voidedById` | string \| null |
| `voidReason` | string \| null |
| `createdById` | string |
| `createdAt`, `updatedAt` | timestamp |

### Ledger (`LedgerResponse`)

```
{
  leaseId: string,
  leaseNumber: string,
  entries: LedgerEntry[],
  summary: {
    monthlyRent: money (fixed 2) | null,   // the lease's rent
    totalCharged: money,                   // non-voided charges, all time
    totalPaid: money,                      // non-voided payments, all time
    balance: money,                        // totalCharged - totalPaid, may be negative
    oldestUnpaidDueDate: date | null
  }
}
```

`LedgerEntry`:

| Field | CHARGE | PAYMENT |
|---|---|---|
| `id` | charge id | payment id |
| `kind` | `"CHARGE"` | `"PAYMENT"` |
| `number` | invoiceNumber | paymentNumber |
| `type` | `ChargeType` | null |
| `description` | string | null |
| `date` | dueDate | paymentDate |
| `amount` | money (fixed 2, positive) | money (fixed 2, positive) |
| `method` | null | `PaymentMethod` |
| `referenceNumber` | null | string \| null |
| `notes` | null | string \| null |
| `voided` | boolean | boolean |
| `voidReason` | string \| null | string \| null |
| `runningBalance` | money, may be negative | money, may be negative |

Voided entries are listed but do not change `runningBalance`. Charges add,
payments subtract.

### Rent roll (`RentRollResponse`)

```
{
  month: "YYYY-MM",
  rows: RentRollRow[],
  summary: {
    totalRentDue: money,          // non-voided charges (any type) due in the month, all rows
    collected: money,             // non-voided payments dated in the month, all rows
    collectionRate: string | null,// collected / totalRentDue * 100, 2 decimals ("85.50"); null if totalRentDue is 0
    outstandingBalance: money,    // sum of positive row balances
    overdueCount: number,         // rows with status OVERDUE
    overdueTotal: money,          // sum of their balances
    securityDepositsHeld: money,  // sum of deposits of ACTIVE leases with deposit > 0 (in scope + propertyId filter; not limited to the month)
    activeDepositCount: number    // how many such leases
  }
}
```

`summary` covers every row before `status`/`search` filtering.

`RentRollRow`:

| Field | Type | Notes |
|---|---|---|
| `leaseId`, `leaseNumber` | string | |
| `leaseStatus` | `LeaseStatus` | `ACTIVE`, `ENDED` or `TERMINATED` |
| `unit` | `{ id, unitNumber, property: { id, name } }` | |
| `primaryTenant` | `{ id, fullName }` \| null | |
| `rent` | money (fixed 2) \| null | |
| `depositHeld` | money (fixed 2) \| null | the lease's deposit |
| `dueDate` | date \| null | `rentDueDay` in this month, clamped to the last day (31 → 30/28/29) |
| `paid` | money | non-voided payments dated in the month |
| `balance` | money | as of the last day of the month; may be negative |
| `oldestUnpaidDueDate` | date \| null | as of the last day of the month |
| `status` | rent roll status | see below |
| `lastPaymentDate` | date \| null | latest non-voided payment on or before month end |

Row status: balance ≤ 0 → `PAID` if any non-voided charge is due in the month,
else `NOT_BILLED`. Balance > 0 → `OVERDUE` if `oldestUnpaidDueDate` is before
today (UTC), else `PARTIAL` if something was paid in the month, else `UNPAID`.

### GenerateRentResponse

`{ month: "YYYY-MM", created: number, skippedExisting: number,
skippedNonMonthly: number, skippedOutsideTerm: number }`

---

## 5. Endpoints

Every protected endpoint can also return the auth errors from section 1
(401 `MISSING_TOKEN`, 401 `INVALID_TOKEN`, 403 `EMAIL_NOT_VERIFIED`,
401 `USER_NOT_REGISTERED`, 403 `FORBIDDEN_ROLE`) and 500. They are not
repeated below. "Planned sample" is the file the capture script will write
under `api-samples/`.

### Health

#### `GET /health`

- Roles: public (no token).
- Response 200: `{ status: "ok", timestamp: timestamp }`.
- Not in admin MVP (infrastructure check, not a screen).
- Planned sample: `api-samples/health/check.200.json`

---

### Auth

#### `POST /auth/register`

Finishes signup after the client created the Firebase account. Creates the
`User` row (and for `TENANT`, a linked `Tenant` row).

**Not in admin MVP: the admin portal must not call this endpoint or show a
registration screen until the owner invite flow exists.**

- Roles: any verified Firebase token **without** a `User` row (uses
  `VerifiedTokenGuard`, no role check). Only `MISSING_TOKEN`,
  `INVALID_TOKEN`, `EMAIL_NOT_VERIFIED` apply.
- Body:

| Field | Type | Required | Validation / message |
|---|---|---|---|
| `role` | `UserRole` | yes | `role must be one of OWNER, PROPERTY_MANAGER, TENANT` |
| `name` | string | yes | not empty: `name is required`; `name must be a string`. Not trimmed. |
| `phone` | string | only when `role` is `TENANT` | `phone is required when role is TENANT`; `phone must be a string`. If sent for other roles it must be a non-empty string. Not trimmed. |

- `email` is taken from the token, never from the body. For `TENANT`, the
  Tenant row gets the email trimmed and lowercased, `fullName` = `name`,
  `createdById` = the new user.
- Business rules: any verified user can register as any role, including
  `OWNER` (the one-Owner rule is planned, not built). A TENANT whose email
  already exists as a staff-created Tenant is rejected (linking is planned,
  not built).
- Errors:

| Status | Message |
|---|---|
| 400 | validation messages above (array) |
| 409 | `Account already registered` (a `User` already exists for this Firebase uid) |
| 409 | `A tenant with email {email} already exists` (TENANT only; `{email}` lowercased) |
| 500 | Another `User` already has this email (different Firebase uid), or the Firebase account has no email |

- Side effects: creates `User`; for `TENANT` also creates `Tenant` (same
  transaction).
- Response 201: `AuthUser`.
- Not in admin MVP for any role (see the note above). There is also no
  tenant portal.
- Planned sample: `api-samples/auth/register.201.json`

#### `GET /auth/me`

- Roles: any registered user.
- Response 200: `AuthUser`.
- Errors: only the auth errors.
- Planned sample: `api-samples/auth/me.200.json`

#### `GET /auth/my-properties`

- Roles: OWNER (all), PROPERTY_MANAGER (assigned).
- Response 200: `Property[]`, in database order (no `orderBy` in the code).
- Not in admin MVP: the admin portal uses `GET /properties` (same data,
  sorted newest first).
- Planned sample: `api-samples/auth/my-properties.200.json`

---

### Properties

#### `POST /properties`

- Roles: OWNER.
- Body:

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | yes | not empty (not trimmed) |
| `street` | string | yes | not empty |
| `city` | string | yes | not empty |
| `state` | string | yes | not empty (free text, no format) |
| `zip` | string | yes | not empty (free text, no format) |
| `propertyType` | `PropertyType` | yes | `propertyType must be one of RESIDENTIAL, COMMERCIAL, MIXED_USE` |
| `propertyValue` | number | yes | > 0, max 2 decimals. No upper limit in the DTO; the column is Decimal(12,2), so above 9,999,999,999.99 gives a 500 |
| `acquisitionDate` | date string | yes | anything `new Date()` parses; send `"YYYY-MM-DD"`. `acquisitionDate must be a Date instance` |
| `description` | string | no | any string |
| `managerIds` | string[] | no | array of non-empty strings; duplicates removed |

- Business rules: every `managerIds` entry must be an existing
  `PROPERTY_MANAGER` user. Property and assignments are created together; if
  one id is invalid nothing is created. No uniqueness on any property field.
- Errors:

| Status | Message |
|---|---|
| 400 | validation messages (array) |
| 400 | `These ids are not existing PROPERTY_MANAGER users: {id1, id2}` |

- Side effects: creates `PropertyManager` rows for `managerIds`.
- Response 201: `Property` (no managers in the body; fetch
  `GET /properties/:id/managers`).
- Planned sample: `api-samples/properties/create.201.json`

#### `GET /properties`

- Roles: OWNER (all), PROPERTY_MANAGER (assigned).
- No query params.
- Response 200: `Property[]`, newest first.
- Planned sample: `api-samples/properties/list.200.json`

#### `GET /properties/:id`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Errors: 404 `Property {id} not found`.
- Response 200: `Property`.
- Planned sample: `api-samples/properties/detail.200.json`

#### `PATCH /properties/:id`

- Roles: OWNER.
- Body: the same fields as POST, all optional, same rules. `managerIds` is
  **not** accepted here (silently dropped); use the managers endpoints.
  `description: null` clears it. `null` on any other field gives a 500.
- Errors: 400 validation; 404 `Property {id} not found`.
- Response 200: `Property` (same shape as GET detail).
- Planned sample: `api-samples/properties/update.200.json`

#### `DELETE /properties/:id`

- Roles: OWNER.
- Business rules: blocked while the property has units or expenses. Manager
  assignments are removed in the same transaction. Documents attached to the
  property are kept with `propertyId` set to null (DB rule).
- Errors:

| Status | Message |
|---|---|
| 404 | `Property {id} not found` |
| 409 | `Cannot delete property {id}: it still has {n} unit(s). Delete or reassign them first.` |
| 409 | `Cannot delete property {id}: it still has expenses. Remove them first.` |

- Response 200: the deleted `Property`.
- Planned sample: `api-samples/properties/delete.200.json`

#### `GET /properties/:propertyId/managers`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Errors: 404 `Property {propertyId} not found`.
- Response 200: `ManagerSummary[]`, oldest assignment first.
- Planned sample: `api-samples/properties/managers-list.200.json`

#### `POST /properties/:propertyId/managers`

- Roles: OWNER.
- Body: `{ userId: string }` (required, non-empty string).
- Errors:

| Status | Message |
|---|---|
| 400 | validation (`userId should not be empty`, `userId must be a string`) |
| 404 | `Property {propertyId} not found` |
| 404 | `User {userId} not found` |
| 400 | `User {userId} is a {role}, not a PROPERTY_MANAGER` |
| 409 | `User {userId} is already a manager of property {propertyId}` |

- Response 201: `ManagerSummary` of the assigned user.
- Planned sample: `api-samples/properties/managers-assign.201.json`

#### `DELETE /properties/:propertyId/managers/:userId`

- Roles: OWNER.
- Errors: 404 `User {userId} is not a manager of property {propertyId}` (also
  when the property doesn't exist).
- Response 200: `ManagerSummary` of the removed manager.
- Planned sample: `api-samples/properties/managers-unassign.200.json`

---

### Managers

Manager accounts are created by the developer for now (Firebase signup +
`POST /auth/register` outside the app). The Owner then assigns them to
properties. There is no create/update/delete manager endpoint.

**Not in admin MVP: the admin portal must not call this endpoint or show a
registration screen until the owner invite flow exists.**

#### `GET /managers`

- Roles: OWNER.
- Response 200: `ManagerListItem[]` (every `PROPERTY_MANAGER` user), email A→Z.
- Planned sample: `api-samples/managers/list.200.json`

#### `GET /managers/:userId`

- Roles: OWNER.
- Errors: 404 `Manager {userId} not found` (also when the user exists but is
  not a `PROPERTY_MANAGER`).
- Response 200: `ManagerDetail`.
- Planned sample: `api-samples/managers/detail.200.json`

---

### Units

#### `POST /units`

- Roles: OWNER, PROPERTY_MANAGER (assigned property, else 403\*).
- Body:

| Field | Type | Required | Validation |
|---|---|---|---|
| `propertyId` | string | yes | not empty |
| `unitNumber` | string | yes | not empty (not trimmed). **Not unique**: two units on one property can share a number |
| `unitType` | `UnitType` | yes | `unitType must be one of STUDIO, ONE_BED, TWO_BED, THREE_BED, FOUR_BED` |
| `floorArea` | number | yes | > 0, any decimals |
| `floor` | integer | no | may be negative (basement) |
| `bathrooms` | integer | no | ≥ 0 |
| `monthlyRent` | number | yes | > 0, max 2 decimals. No upper limit in the DTO; column is Decimal(10,2), so above 99,999,999.99 gives a 500 |
| `status` | `UnitStatus` | no | default `VACANT`. `status must be one of VACANT, OCCUPIED, RESERVED, UNDER_MAINTENANCE`. `OCCUPIED` is rejected (see errors) |
| `description` | string | no | |

- Errors (checked in this order):

| Status | Message |
|---|---|
| 400 | validation messages (array) |
| 400 | `Occupied is set by activating a lease` |
| 403 | `You do not have access to this property` (manager not assigned; also when the property doesn't exist) |
| 404 | `Property {propertyId} not found` (OWNER) |

- Response 201: `Unit`.
- Planned sample: `api-samples/units/create.201.json`

#### `GET /units`

- Roles: OWNER (all), PROPERTY_MANAGER (assigned).
- Query: `propertyId` (optional string). Omitted: all visible units. Unknown
  or out-of-scope id: `[]`, not 404. Not validated. Sending it twice gives a
  500.
- Response 200: `Unit[]`.
- Planned sample: `api-samples/units/list.200.json`

#### `GET /units/:id`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Errors: 404 `Unit {id} not found`.
- Response 200: `Unit`.
- Planned sample: `api-samples/units/detail.200.json`

#### `PATCH /units/:id`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 403\*).
- Body: same fields as POST except `propertyId`, all optional, same rules.
  `floor`, `bathrooms`, `description` can be cleared with `null`; `null` on
  other fields gives a 500.
- Business rules (status):
  - Sending the unit's current `status` is always fine (no-op).
  - Changing to `OCCUPIED` is never allowed by hand.
  - Any other status change is blocked while the unit has an `ACTIVE` lease.
- Errors:

| Status | Message |
|---|---|
| 400 | validation messages (array), including `propertyId cannot be changed via this endpoint` |
| 404 | `Unit {id} not found` |
| 403 | `You do not have access to this property` (manager not assigned) |
| 400 | `Occupied is set by activating a lease` |
| 409 | `Status is controlled by the active lease` |

- Response 200: `Unit` (same shape as GET detail).
- Planned sample: `api-samples/units/update.200.json`

#### `DELETE /units/:id`

- Roles: OWNER.
- Business rules: blocked while the unit has any lease (any status, even
  DRAFT) or maintenance tickets. Expenses don't block it: they are kept with
  `unitId` set to null (DB rule), even though the 409 message below mentions
  expenses.
- Errors:

| Status | Message |
|---|---|
| 404 | `Unit {id} not found` |
| 409 | `This unit has leases. Draft leases can be deleted, but active or ended leases are kept as history, so the unit cannot be deleted.` |
| 409 | `Cannot delete unit {id}: it still has related records (maintenance tickets or expenses). Remove them first.` |

- Response 200: the deleted `Unit`.
- Planned sample: `api-samples/units/delete.200.json`

---

### Tenants

No property scoping: every OWNER and PROPERTY_MANAGER sees every tenant.

#### `POST /tenants`

- Roles: OWNER, PROPERTY_MANAGER.
- Body (strings marked "trimmed" are trimmed before validation):

| Field | Type | Required | Validation |
|---|---|---|---|
| `fullName` | string | yes | trimmed, not empty |
| `email` | string | yes | trimmed + lowercased, valid email (`email must be an email`). **Unique across all tenants**, compared after lowercasing, so effectively case-insensitive |
| `phone` | string | yes | trimmed, not empty, no format check |
| `idNumber` | string | no | trimmed |
| `address` | string | no | trimmed |
| `tenantType` | `TenantType` | no | default `INDIVIDUAL`. `tenantType must be one of INDIVIDUAL, COMPANY` |
| `moveInDate` | date string | no | timestamp field (see 1), send `"YYYY-MM-DD"` |
| `preferredContactMethod` | `ContactMethod` | no | default `EMAIL`. `preferredContactMethod must be one of EMAIL, PHONE, SMS` |
| `notes` | string | no | trimmed |

  `id`, `userId`, `createdById` are ignored. `null` on `tenantType` or
  `preferredContactMethod` gives a 500.
- Errors: 400 validation; 409 `A tenant with email {email} already exists`
  (`{email}` lowercased).
- Response 201: `Tenant` (**no `createdBy`**, includes `idNumber`).
- Planned sample: `api-samples/tenants/create.201.json`

#### `GET /tenants`

- Roles: OWNER, PROPERTY_MANAGER.
- Query: `search` (optional). Trimmed; case-insensitive "contains" on
  `fullName`, `email` or `phone`. Empty or omitted: all tenants. Sent more
  than once: ignored.
- Response 200: `TenantListItem[]` (no `idNumber`), newest first.
- Planned sample: `api-samples/tenants/list.200.json`

#### `GET /tenants/:id`

- Roles: OWNER, PROPERTY_MANAGER.
- Errors: 404 `Tenant {id} not found`.
- Response 200: `TenantDetail` (with `idNumber` and `createdBy`).
- Planned sample: `api-samples/tenants/detail.200.json`

#### `PATCH /tenants/:id`

- Roles: OWNER, PROPERTY_MANAGER.
- Body: same fields as POST, all optional, same rules. `idNumber`, `address`,
  `moveInDate`, `notes` can be cleared with `null`; `null` on other fields
  gives a 500. Changing `email` on a self-registered tenant does not change
  their login email (`User.email`).
- Errors: 400 validation; 404 `Tenant {id} not found`; 409
  `A tenant with email {email} already exists`.
- Response 200: `Tenant` (**not** the GET detail shape: no `createdBy`).
- Planned sample: `api-samples/tenants/update.200.json`

#### `DELETE /tenants/:id`

- Roles: OWNER.
- Business rules: blocked while the tenant is on any lease (any status). Only
  DRAFT leases can be deleted, so a tenant who was ever on an ACTIVE lease
  cannot be deleted.
- Errors:

| Status | Message |
|---|---|
| 404 | `Tenant {id} not found` |
| 409 | `Cannot delete tenant {id}: it still has {n} lease(s). Delete them first.` |
| 409 | `Cannot delete tenant {id}: it still has related records. Remove them first.` |

- Response 200: the deleted `Tenant` (no `createdBy`).
- Planned sample: `api-samples/tenants/delete.200.json`

---

### Leases

Lifecycle: `DRAFT` → (activate) → `ACTIVE` → (end) → `ENDED` or `TERMINATED`.
No other transitions. A lease can also be created directly as `ACTIVE`.
`ENDED` and `TERMINATED` are final and behave the same; only the label
differs.

Activation requires: `primaryTenantId`, `startDate`, `endDate`, `rent`,
`deposit`, `rentDueDay`, `paymentFrequency`, and `endDate` after
`startDate`, and no other `ACTIVE` lease on the same unit overlapping
`[startDate, endDate]` (inclusive). The unit's current status is **not**
checked (a `RESERVED` or `UNDER_MAINTENANCE` unit can be activated).

`lateFeeAmount`, `lateFeeGraceDays`, `autoRenew` and `signatureStatus` are
stored only: no code applies late fees, renews leases or sends for signature.

#### `POST /leases`

- Roles: OWNER, PROPERTY_MANAGER (unit on an assigned property, else 403\*).
- Body:

| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `unitId` | string | yes | | not empty |
| `status` | `"DRAFT"` \| `"ACTIVE"` | no | `DRAFT` | `status must be DRAFT or ACTIVE when creating a lease`. `ACTIVE` runs the activation checks |
| `signatureStatus` | `SignatureStatus` | no | `NOT_SENT` | `signatureStatus must be one of NOT_SENT, PENDING, SIGNED` |
| `startDate` | date | no* | null | strict `YYYY-MM-DD` |
| `endDate` | date | no* | null | strict `YYYY-MM-DD`. Not compared with `startDate` until activation |
| `paymentFrequency` | `PaymentFrequency` | no | `MONTHLY` | `paymentFrequency must be one of WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY` |
| `rent` | number | no* | null | 0 – 9,999,999,999.99, max 2 decimals (0 is allowed) |
| `deposit` | number | no* | null | 0 – 9,999,999,999.99, max 2 decimals |
| `lateFeeAmount` | number | no | 0 | 0 – 9,999,999,999.99, max 2 decimals |
| `lateFeeGraceDays` | integer | no | 5 | ≥ 0 |
| `rentDueDay` | integer | no* | null | 1–31 |
| `autoRenew` | boolean | no | false | |
| `tags` | string[] | no | `[]` | each trimmed, inner spaces collapsed, empties and case-insensitive duplicates removed; then max 10 tags, each max 30 chars |
| `notes` | string | no | null | trimmed |
| `primaryTenantId` | string | no* | none | non-empty; must exist |
| `coTenantIds` | string[] | no | `[]` | non-empty strings, no duplicates, each must exist, must not include `primaryTenantId` |

  \* required when `status` is `ACTIVE`. `id`, `leaseNumber`, `createdById`
  are ignored. `null` on fields with a default (`signatureStatus`,
  `paymentFrequency`, `lateFeeAmount`, `lateFeeGraceDays`, `autoRenew`,
  `tags`) gives a 500.
- Uniqueness: `leaseNumber` is unique and server-generated. A tenant can be
  on several leases.
- Errors (checked in this order):

| Status | Message |
|---|---|
| 400 | validation messages (array) |
| 404 | `Unit {unitId} not found` |
| 403 | `You do not have access to this property` |
| 400 | `Tenant {id} can't be both the primary tenant and a co-tenant` |
| 404 | `Tenant(s) not found: {id1, id2}` |
| 400 | `Cannot activate lease: missing {field1, field2}` (ACTIVE only; fields in the order primaryTenantId, startDate, endDate, rent, deposit, rentDueDay, paymentFrequency) |
| 400 | `endDate must be after startDate` (ACTIVE only) |
| 409 | `Unit already has an ACTIVE lease ({leaseNumber}) overlapping these dates` (ACTIVE only) |
| 409 | `Could not allocate a lease number, please retry` |

- Side effects: with `status: "ACTIVE"`, the unit becomes `OCCUPIED`.
- Response 201: `Lease` (same shape as GET detail).
- Planned samples: `api-samples/leases/create-draft.201.json`,
  `api-samples/leases/create-active.201.json`

#### `GET /leases`

- Roles: OWNER (all), PROPERTY_MANAGER (assigned).
- Query (all optional, combined with AND):

| Param | Validation | Behaviour |
|---|---|---|
| `propertyId` | non-empty string if present (`propertyId should not be empty`) | leases on units of that property; unknown or out of scope → `[]` |
| `unitId` | non-empty string if present | |
| `status` | `LeaseStatus` (`status must be one of DRAFT, ACTIVE, ENDED, TERMINATED`) | |
| `search` | string, trimmed | case-insensitive "contains" on `leaseNumber`, unit `unitNumber`, or any tenant's `fullName`. Empty → ignored |

  Unknown query params are ignored.
- Errors: 400 for invalid query values.
- Response 200: `Lease[]`, newest first.
- Planned sample: `api-samples/leases/list.200.json`

#### `GET /leases/tag-suggestions`

- Roles: OWNER, PROPERTY_MANAGER.
- Response 200: `string[]`. Always starts with `Pet-Friendly`,
  `Parking Included`, `Premium`, `Top Floor`, `Penthouse`, `Short Term`,
  followed by the other tags used on leases you can see (A→Z).
- Planned sample: `api-samples/leases/tag-suggestions.200.json`

#### `GET /leases/:id`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Errors: 404 `Lease {id} not found`.
- Response 200: `Lease`.
- Planned sample: `api-samples/leases/detail.200.json`

#### `PATCH /leases/:id`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Body: the POST fields except `status`, all optional, same validation, plus:
  - `status`: always rejected (400
    `status cannot be changed via PATCH; use POST /leases/:id/activate or /end`).
  - `unitId`: can only change while the lease is `DRAFT`.
  - `primaryTenantId`: replaces the primary tenant; `null` removes it; omit to
    keep it.
  - `coTenantIds`: replaces all co-tenants; `[]` removes them; omit to keep
    them.
  - `tags`: replaces the whole list.
- Business rules:
  - Allowed on every status (DRAFT, ACTIVE, ENDED, TERMINATED).
  - On an `ACTIVE` lease the activation checks run again on the merged values
    (so you can't remove the primary tenant or make dates invalid or
    overlapping). The error text still says "Cannot activate lease: …".
  - On a `DRAFT` lease nothing is checked across fields (e.g. `endDate`
    before `startDate` is accepted until activation).
  - `null` clears `startDate`, `endDate`, `rent`, `deposit`, `rentDueDay`,
    `notes`. On an ACTIVE lease this skips the activation check. Do not send
    `null` for these on ACTIVE leases. `null` on `signatureStatus`,
    `paymentFrequency`, `lateFeeAmount`, `lateFeeGraceDays`, `autoRenew`,
    `tags` gives a 500.
- Errors:

| Status | Message |
|---|---|
| 400 | validation messages (array) |
| 404 | `Lease {id} not found` |
| 409 | `Cannot change the unit of lease {leaseNumber}: it is {status}. Only DRAFT leases can move to another unit.` |
| 404 | `Unit {unitId} not found` |
| 403 | `You do not have access to this property` |
| 400 | `Tenant {id} can't be both the primary tenant and a co-tenant` |
| 404 | `Tenant(s) not found: {ids}` |
| 400 | `Cannot activate lease: missing {fields}` (ACTIVE leases) |
| 400 | `endDate must be after startDate` (ACTIVE leases) |
| 409 | `Unit already has an ACTIVE lease ({leaseNumber}) overlapping these dates` (ACTIVE leases) |

- Response 200: `Lease` (same shape as GET detail).
- Planned sample: `api-samples/leases/update.200.json`

#### `POST /leases/:id/activate`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Body: none.
- Errors:

| Status | Message |
|---|---|
| 404 | `Lease {id} not found` |
| 409 | `Cannot activate lease {leaseNumber}: it is {status}. Only DRAFT leases can be activated.` |
| 400 | `Cannot activate lease: missing {fields}` |
| 400 | `endDate must be after startDate` |
| 409 | `Unit already has an ACTIVE lease ({leaseNumber}) overlapping these dates` |

- Side effects: lease → `ACTIVE`; unit → `OCCUPIED`.
- Response 200: `Lease`.
- Planned sample: `api-samples/leases/activate.200.json`

#### `POST /leases/:id/end`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Body: `{ status?: "ENDED" | "TERMINATED" }`, default `ENDED`. Message:
  `status must be ENDED or TERMINATED`.
- Errors:

| Status | Message |
|---|---|
| 400 | validation |
| 404 | `Lease {id} not found` |
| 409 | `Cannot end lease {leaseNumber}: it is still DRAFT. Delete it instead.` |
| 409 | `Cannot end lease {leaseNumber}: it is already {status}.` |

- Side effects: lease → `ENDED`/`TERMINATED`; unit → `VACANT` unless another
  `ACTIVE` lease exists on it. `endDate` is not changed.
- Response 200: `Lease`.
- Planned sample: `api-samples/leases/end.200.json`

#### `DELETE /leases/:id`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Business rules: only `DRAFT` leases. Its tenant links are removed with it.
  Documents attached to it are kept with `leaseId` set to null.
- Errors:

| Status | Message |
|---|---|
| 404 | `Lease {id} not found` |
| 409 | `Cannot delete lease {leaseNumber}: it is {status}. Only DRAFT leases can be deleted; end the lease instead.` |
| 409 | `Cannot delete lease {leaseNumber}: it still has related records (payments or messages). Remove them first.` |

- Response 200: the deleted `Lease` (as it was just before deletion).
- Planned sample: `api-samples/leases/delete.200.json`

---

### Ledger

#### `GET /leases/:id/ledger`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Errors: 404 `Lease {id} not found`.
- Response 200: `LedgerResponse` (works for any status; a DRAFT lease has no
  entries).
- Planned sample: `api-samples/ledger/ledger.200.json`

---

### Charges

There is no list or detail endpoint for charges: read them from the ledger.
Charges are never edited or deleted, only voided.

#### `POST /leases/:id/charges`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Body:

| Field | Type | Required | Validation |
|---|---|---|---|
| `type` | `ChargeType` | yes | `type must be one of RENT, LATE_FEE, OTHER` |
| `description` | string | yes | trimmed, not empty, max 200 chars |
| `amount` | number | yes | 0.01 – 9,999,999,999.99, max 2 decimals. `amount must be greater than 0` |
| `dueDate` | date | yes | strict `YYYY-MM-DD`; any date (past or future) |
| `periodMonth` | `"YYYY-MM"` | required for `RENT`, forbidden otherwise | `periodMonth must be a month in YYYY-MM format (required on RENT charges)`; on non-RENT (even `null`): `periodMonth is only allowed on RENT charges` |

- Uniqueness: one non-voided `RENT` charge per lease per `periodMonth` (shared
  with rent generation; DB index `Charge_one_rent_per_lease_month`). A voided
  one doesn't count. `periodMonth` is not compared with `dueDate`.
- Business rules: lease must not be `DRAFT` (ACTIVE, ENDED, TERMINATED are
  fine).
- Errors:

| Status | Message |
|---|---|
| 400 | validation messages (array) |
| 404 | `Lease {id} not found` |
| 409 | `Cannot add a charge to lease {leaseNumber}: it is still DRAFT. Activate it first.` |
| 409 | `Rent for {periodMonth} already exists` |
| 409 | `Could not allocate a INV number, please retry` |

- Response 201: `Charge`.
- Planned sample: `api-samples/charges/create.201.json`

#### `POST /leases/:id/charges/:chargeId/void`

- Roles: OWNER.
- Body: `{ reason: string }`: trimmed, not empty, max 300 chars.
- Errors:

| Status | Message |
|---|---|
| 400 | validation (`reason should not be empty`, `reason must be a string`, `reason must be shorter than or equal to 300 characters`) |
| 404 | `Lease {id} not found` |
| 404 | `Charge {chargeId} not found` (also when it belongs to another lease) |
| 409 | `Charge {invoiceNumber} is already voided` |

- Side effects: sets `voidedAt`, `voidedById`, `voidReason`. The charge stops
  counting in balances. Voiding a RENT charge frees its month for a new one.
- Response 200: `Charge` (with `voided: true`).
- Planned sample: `api-samples/charges/void.200.json`

---

### Payments

No list or detail endpoint: read them from the ledger. Payments are never
edited or deleted, only voided.

#### `POST /leases/:id/payments`

- Roles: OWNER, PROPERTY_MANAGER (assigned, else 404).
- Body:

| Field | Type | Required | Validation |
|---|---|---|---|
| `amount` | number | yes | 0.01 – 9,999,999,999.99, max 2 decimals. `amount must be greater than 0` |
| `method` | `PaymentMethod` | yes | `method must be one of ACH, CHECK, CREDIT_CARD, CASH, OTHER` |
| `paymentDate` | date | yes | strict `YYYY-MM-DD`; any date |
| `referenceNumber` | string | no | trimmed, max 100 chars, not unique |
| `notes` | string | no | trimmed, max 1000 chars |

- Business rules: lease must not be `DRAFT`. Overpayment is allowed (balance
  goes negative). Payments are not linked to specific charges; they are
  applied to the oldest charges first when computing balances.
- Errors:

| Status | Message |
|---|---|
| 400 | validation messages (array) |
| 404 | `Lease {id} not found` |
| 409 | `Cannot add a payment to lease {leaseNumber}: it is still DRAFT. Activate it first.` |
| 409 | `Could not allocate a PMT number, please retry` |

- Response 201: `Payment`.
- Planned sample: `api-samples/payments/create.201.json`

#### `POST /leases/:id/payments/:paymentId/void`

- Roles: OWNER.
- Body: `{ reason: string }`, same rules as charge void.
- Errors: 400 validation; 404 `Lease {id} not found`; 404
  `Payment {paymentId} not found`; 409 `Payment {paymentNumber} is already voided`.
- Side effects: sets `voidedAt`, `voidedById`, `voidReason`; the payment
  stops counting in balances.
- Response 200: `Payment` (with `voided: true`).
- Planned sample: `api-samples/payments/void.200.json`

---

### Rent roll

#### `GET /rent-roll`

- Roles: OWNER (all), PROPERTY_MANAGER (assigned).
- Query (all optional):

| Param | Validation | Behaviour |
|---|---|---|
| `month` | `"YYYY-MM"` (`month must be a month in YYYY-MM format`) | default: current UTC month |
| `propertyId` | non-empty string | filters rows **and** summary; unknown/out of scope → no rows |
| `status` | `PAID`, `PARTIAL`, `UNPAID`, `OVERDUE`, `NOT_BILLED` (`status must be one of PAID, PARTIAL, UNPAID, OVERDUE, NOT_BILLED`) | filters rows only, not the summary |
| `search` | string, trimmed | case-insensitive "contains" on lease number, unit number or any tenant's name; rows only |

- Which leases appear: `ACTIVE` leases whose term overlaps the month, plus
  `ENDED`/`TERMINATED` leases with a balance > 0 as of the month's last day.
  DRAFT leases never appear.
- Errors: 400 for invalid query values.
- Response 200: `RentRollResponse`.
- Planned sample: `api-samples/rent-roll/rent-roll.200.json`

#### `POST /rent-roll/generate`

- Roles: OWNER (all), PROPERTY_MANAGER (assigned properties only).
- Body: `{ month: "YYYY-MM" }` (required; any past or future month).
- Business rules: for every in-scope `ACTIVE` lease overlapping the month:
  - not `MONTHLY` → skipped (`skippedNonMonthly`);
  - due date (`rentDueDay` clamped to the month) outside
    `[startDate, endDate]` → skipped (`skippedOutsideTerm`);
  - already has a non-voided RENT charge for the month → skipped
    (`skippedExisting`);
  - otherwise creates a `RENT` charge: amount = lease `rent`,
    description `Monthly Rent - {Month YYYY}` (e.g. `Monthly Rent - October 2026`),
    `periodMonth` = month, `dueDate` = the clamped due date.
  Safe to run more than once.
- Errors: 400 `month must be a month in YYYY-MM format`; 409
  `Could not allocate a INV number, please retry`.
- Response 201: `GenerateRentResponse`.
- Planned sample: `api-samples/rent-roll/generate.201.json`

---

### Routes that exist but have no endpoints

`/documents`, `/expenses`, `/vendors`, `/maintenance-tickets`, `/messages` and
`/audit-log` have empty controllers. Every request returns the Nest 404
`Cannot {METHOD} {path}`. Not in admin MVP.

---

## 6. Shapes returned by POST, PATCH and DELETE

### What each DELETE returns

All return **200** with the deleted record in the body (no 204).

| Endpoint | Body |
|---|---|
| `DELETE /properties/:id` | deleted `Property` |
| `DELETE /properties/:propertyId/managers/:userId` | `ManagerSummary` of the unassigned manager |
| `DELETE /units/:id` | deleted `Unit` |
| `DELETE /tenants/:id` | deleted `Tenant` (no `createdBy`) |
| `DELETE /leases/:id` | `Lease` as it was just before deletion (full shape incl. `unit`, `tenants`, `balance`) |

### Does PATCH return the GET detail shape?

| Endpoint | Same as GET detail? |
|---|---|
| `PATCH /properties/:id` | Yes (`Property`) |
| `PATCH /units/:id` | Yes (`Unit`) |
| `PATCH /tenants/:id` | **No**: returns `Tenant` without `createdBy` (GET detail has `createdBy`) |
| `PATCH /leases/:id` | Yes (`Lease`) |

### Does POST return the GET detail shape?

| Endpoint | Same as GET detail? |
|---|---|
| `POST /auth/register` | Yes, same as `GET /auth/me` (`AuthUser`) |
| `POST /properties` | Yes (`Property`; managers are never embedded) |
| `POST /properties/:propertyId/managers` | Returns one `ManagerSummary`, same shape as the items of `GET /properties/:propertyId/managers` |
| `POST /units` | Yes (`Unit`) |
| `POST /tenants` | **No**: `Tenant` without `createdBy` |
| `POST /leases` | Yes (`Lease`) |
| `POST /leases/:id/activate`, `/end` | Yes (`Lease`) |
| `POST /leases/:id/charges`, `.../void` | `Charge`. No charge GET exists; the ledger shows charges as `LedgerEntry` (a different shape) |
| `POST /leases/:id/payments`, `.../void` | `Payment`. No payment GET exists; the ledger shows payments as `LedgerEntry` |
| `POST /rent-roll/generate` | `GenerateRentResponse` (counts only, not the charges) |

---

## 7. Not in admin MVP / planned, not built

### Not in admin MVP

- `GET /health`: infrastructure only.
- `POST /auth/register` (any role): the admin portal must not call it or
  show a registration screen until the owner invite flow exists. There is
  also no tenant portal; a TENANT can only call `/auth/me`.
- `GET /auth/my-properties`: the admin portal uses `GET /properties`.
- `/documents`, `/expenses`, `/vendors`, `/maintenance-tickets`, `/messages`,
  `/audit-log`: no endpoints.
- **UNCLEAR:** the repo has no MVP scope document, so this list only holds
  what is clearly not an admin screen.

### Planned, not built

| Feature | Current behaviour |
|---|---|
| Owner invite flow | Planned. Until then, accounts are created by the developer. `/auth/register` still lets the caller pick any role, including `OWNER`. |
| One-Owner rule | Not enforced. Anyone with a verified Firebase account can register as `OWNER`. |
| Tenant self-register linking | Not built. A TENANT registering with an email that already belongs to a staff-created Tenant gets 409 `A tenant with email {email} already exists`. |
| Documents / uploads | `Document` table exists, `/documents` controller is empty. No upload endpoint. |
| Reminders | None (no rent, lease-ending or late-fee reminders; no scheduled jobs). |
| Export | None (no CSV/PDF export of rent roll, ledger or lists). |

Also stored but not acted on: `autoRenew`, `signatureStatus`,
`lateFeeAmount`, `lateFeeGraceDays`.
