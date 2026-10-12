# Form rules

What a form must respect before sending. Generated from the DTOs and services;
full details, error messages and response shapes are in [API.md](API.md).

General (every form):

- Money: send JSON **numbers**, max 2 decimals. Responses return strings.
- Dates marked "date": exactly `YYYY-MM-DD` and a real day.
- Months: `YYYY-MM`.
- Don't send `null` unless a field below says it clears the value.
- Unknown fields are ignored silently, so a typo in a field name is not
  reported.
- Text fields have no max length unless one is listed.
- Fields marked "not trimmed" accept `"  "` as non-empty: trim in the form.

## Auth

There is no registration form in the admin portal. Sign-in only.

- On 401 `USER_NOT_REGISTERED`, keep the user signed in and show "Your
  account isn't set up yet. Ask the owner to add you." with a Sign out button.
  Do NOT show a registration or role form in the admin portal:
  `/auth/register` lets the caller choose any role, including `OWNER`, until
  the invite flow exists. Accounts are created by the developer for now.
- On 403 `EMAIL_NOT_VERIFIED`, ask them to verify their email. After the user
  verifies, call `getIdToken(true)` and retry.

## Properties

- Create / edit / delete: OWNER only. View: OWNER, and managers for their
  assigned properties.
- Required on create: `name`, `street`, `city`, `state`, `zip` (non-empty,
  not trimmed, no format), `propertyType` (`RESIDENTIAL` | `COMMERCIAL` |
  `MIXED_USE`), `propertyValue` (> 0, max 2 decimals, at most
  9,999,999,999.99), `acquisitionDate` (send `YYYY-MM-DD`).
- Optional: `description` (`null` clears it on edit), `managerIds` (create
  only; each must be an existing PROPERTY_MANAGER).
- No unique fields.
- Delete is blocked while the property has units or expenses.
- Managers: assign/unassign is OWNER only; the user must be a
  `PROPERTY_MANAGER` and not already assigned.

## Managers

- OWNER only (list and detail).
- No create form. Manager accounts are created by the developer for now
  (Firebase signup + `POST /auth/register` outside the app); the Owner then
  assigns them to properties. An invite flow is planned.

## Units

- Create / edit: OWNER, or a manager on the unit's property. Delete: OWNER
  only.
- Required on create: `propertyId`, `unitNumber` (non-empty, not trimmed),
  `unitType` (`STUDIO` | `ONE_BED` | `TWO_BED` | `THREE_BED` | `FOUR_BED`),
  `floorArea` (> 0), `monthlyRent` (> 0, max 2 decimals, at most
  99,999,999.99).
- Optional: `floor` (integer, can be negative), `bathrooms` (integer ≥ 0),
  `status` (default `VACANT`), `description`. On edit, `floor`, `bathrooms`,
  `description` can be cleared with `null`.
- `unitNumber` is **not unique**: check for duplicates in the form if needed.
- `propertyId` can't be changed after creation (don't send it on edit).
- Status:
  - Never offer `OCCUPIED`: it is set only by activating a lease.
  - While the unit has an ACTIVE lease, the status can't be changed (only
    re-sent unchanged).
  - Otherwise any of `VACANT`, `RESERVED`, `UNDER_MAINTENANCE`.
- Delete is blocked while the unit has any lease (even DRAFT) or maintenance
  tickets.

## Tenants

- Create / view / edit: OWNER and every manager (tenants are not scoped by
  property). Delete: OWNER only.
- Required: `fullName` (trimmed, non-empty), `email` (valid email), `phone`
  (trimmed, non-empty, no format).
- `email` is **unique across all tenants, case-insensitive** (stored
  lowercase).
- Optional: `idNumber`, `address`, `notes` (all trimmed), `moveInDate` (send
  `YYYY-MM-DD`), `tenantType` (`INDIVIDUAL` default | `COMPANY`),
  `preferredContactMethod` (`EMAIL` default | `PHONE` | `SMS`). On edit,
  `idNumber`, `address`, `moveInDate`, `notes` can be cleared with `null`.
- The list does not include `idNumber`; open the detail to show it.
- Delete is blocked while the tenant is on any lease, and only DRAFT leases
  can be deleted.

## Leases

- Everything: OWNER, or a manager on the property of the lease's unit.
- Create:
  - Required: `unitId`.
  - `status`: `DRAFT` (default) or `ACTIVE`.
  - For `ACTIVE` (or later activation) all of these must be set:
    `primaryTenantId`, `startDate`, `endDate`, `rent`, `deposit`,
    `rentDueDay`, `paymentFrequency` (defaults to `MONTHLY`).
  - `endDate` must be after `startDate` (checked at activation only: check it
    in the form for drafts too).
  - The unit can't have another ACTIVE lease overlapping the dates (inclusive).
- Field limits:
  - `rent`, `deposit`, `lateFeeAmount`: 0 – 9,999,999,999.99, max 2 decimals.
  - `lateFeeGraceDays`: integer ≥ 0 (default 5).
  - `rentDueDay`: integer 1–31 (31 becomes the month's last day for shorter
    months).
  - `tags`: max 10, each max 30 chars after trimming; duplicates
    (case-insensitive) are merged.
  - `coTenantIds`: no duplicates, must not contain `primaryTenantId`, all must
    exist.
  - `signatureStatus`: `NOT_SENT` (default) | `PENDING` | `SIGNED`.
  - `paymentFrequency`: `WEEKLY` | `BIWEEKLY` | `MONTHLY` | `QUARTERLY`. Only
    `MONTHLY` leases get rent from "Generate rent".
- Edit (PATCH):
  - Never send `status`: use Activate / End.
  - `unitId` can change only while DRAFT.
  - On an ACTIVE lease the activation rules above still apply. Don't send
    `null` for dates, rent, deposit or rentDueDay.
  - `primaryTenantId: null` removes the primary tenant (DRAFT only in
    practice); `coTenantIds: []` removes co-tenants; `tags` replaces the
    list.
  - `leaseNumber` is generated by the server and can't be edited.
- Allowed status changes:

| From | Action | To |
|---|---|---|
| DRAFT | Activate | ACTIVE (unit becomes OCCUPIED) |
| DRAFT | Delete | (removed) |
| ACTIVE | End | ENDED or TERMINATED (unit becomes VACANT if no other ACTIVE lease) |
| ENDED / TERMINATED | none | final |

## Charges

- Add: OWNER or the lease's manager. Void: OWNER only. No edit, no delete.
- Lease must not be DRAFT.
- Required: `type` (`RENT` | `LATE_FEE` | `OTHER`), `description` (trimmed,
  1–200 chars), `amount` (0.01 – 9,999,999,999.99, max 2 decimals), `dueDate`.
- `periodMonth` (`YYYY-MM`): required for `RENT`; don't send it at all
  (not even `null`) for other types.
- Only one non-voided RENT charge per lease per month.
- Void: `reason` required, trimmed, 1–300 chars. A charge can be voided once.

## Payments

- Add: OWNER or the lease's manager. Void: OWNER only. No edit, no delete.
- Lease must not be DRAFT.
- Required: `amount` (0.01 – 9,999,999,999.99, max 2 decimals), `method`
  (`ACH` | `CHECK` | `CREDIT_CARD` | `CASH` | `OTHER`), `paymentDate`.
- Optional: `referenceNumber` (trimmed, max 100), `notes` (trimmed, max 1000).
- Overpayment is allowed (balance goes negative = credit).
- Void: `reason` required, trimmed, 1–300 chars. A payment can be voided once.

## Rent Roll

- OWNER (all properties) and managers (assigned properties).
- Filters: `month` (`YYYY-MM`, default current UTC month), `propertyId`,
  `status` (`PAID` | `PARTIAL` | `UNPAID` | `OVERDUE` | `NOT_BILLED`),
  `search`. `status` and `search` don't change the summary cards.
- Generate rent: `month` required (`YYYY-MM`). Safe to repeat; it skips
  leases that already have that month's rent, aren't MONTHLY, or whose due
  date is outside the lease term. Show the returned counts.
