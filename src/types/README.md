# src/types

TypeScript types for API responses. Each one is copied from docs/API.md (and checked against docs/api-samples when samples exist). No logic here.

## auth.ts
- `UserRole`: `OWNER | PROPERTY_MANAGER | TENANT`.
- `Me`: the AuthUser returned by GET /auth/me (`phone` can be null; `firebaseUid` is never returned).
- `AuthErrorCode`: the 5 values of `ApiError.code`. Only auth errors have a code.

## property.ts
- `PropertyType`: `RESIDENTIAL | COMMERCIAL | MIXED_USE`.
- `Property`: one row from GET /properties (`propertyValue` is a money string, `acquisitionDate` is a full timestamp).
