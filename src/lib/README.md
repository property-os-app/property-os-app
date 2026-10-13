# src/lib

Plain TypeScript helpers with no UI: env, Firebase, the API client, labels, form and table helpers, and the design system's `cn` and `format` helpers.

## env.ts
- `env`: typed, trimmed values of the 5 `VITE_*` variables (API URL without trailing slash).
- `missingEnv`: names of missing or empty variables; `main.tsx` shows them on the page.
- `Env`: type of `env`.

## firebase.ts
- `app`: the Firebase app from env.
- `auth`: Firebase Auth instance.
- `authReady`: promise that resolves with the user (or null) once Firebase has restored the session. Await it before reading `auth.currentUser`.

## api.ts
- `apiFetch<T>(path, { method, body, query, signal })`: calls `VITE_API_URL + path`, adds `Authorization: Bearer <token>` when signed in, sends `body` as JSON, builds the query string (skips undefined, null, ""), returns `undefined` for 204 or empty bodies.
- `ApiError`: thrown on error responses: `status`, `messages: string[]` (backend message is a string or an array), `error`, `code` (only on the 5 auth errors, e.g. `INVALID_TOKEN`; switch on it, never on message text). `status` 0 means the server could not be reached.
- `errorText(err)`: one display text for any error.
- `ApiFetchOptions`: options type.

## useDocumentTitle.ts
- `useDocumentTitle(title)`: sets the browser tab to "<title> · PropertyOS Admin".

## format.ts (design system file, adapted to our API)
- `formatCurrency(value)`: "1200.00" -> "$1,200.00", "-150.00" -> "-$150.00"; empty -> "-". Numbers still work.
- `formatCompactCurrency(value)`: "$128.4K" / "$24.6M" for KPIs.
- `formatPercent(value, digits)`: "94.2%", accepts strings.
- `toCents(value)`: money string -> integer cents with no float math. Do all sums and comparisons in cents.
- `centsToAmount(cents)`: cents -> number with max 2 decimals, for sending to the API.
- `formatDate(date)`: "Nov 1, 2026" from "YYYY-MM-DD", a full ISO string or a Date. Never uses `new Date("YYYY-MM-DD")`.
- `formatRelative(date)`: "2h ago"; only for full timestamps like createdAt.
- `leaseCountdown(end)`: "Expires in 23 days" + tone, counted in calendar days.
- `todayISO()` / `currentMonth()`: local "YYYY-MM-DD" / "YYYY-MM" (not UTC).
- `todayUTC()`: UTC "YYYY-MM-DD", the backend's "today" (overdue, endingSoon).
- `daysUntil(date)`: calendar days from local today to a "YYYY-MM-DD" date (negative in the past, null if invalid).
- `addMonthsISO(date, n)`: "YYYY-MM-DD" + n months on year/month/day numbers; the day is clamped to the month's last day.
- `addDaysISO(date, n)`: "YYYY-MM-DD" + n days (no time zone math).
- `ordinal(n)`: "1st", "2nd", "3rd", "31st".
- `isMonth(value)`: true for a valid "YYYY-MM".
- `currentMonthUTC()`: UTC "YYYY-MM", the backend's default month (Rent Roll, generate rent).
- `formatMonth(month)`: "2026-10" -> "October 2026".
- `addMonthsYM(month, n)`: "YYYY-MM" + n months on numbers (no Date math).
- `dayInMonth(month, day)`: day of a "YYYY-MM" month, clamped to its last day ("2026-02", 31 -> "2026-02-28").
- `initials(name)`: "Jordan Blake" -> "JB".
- `EMPTY`: "-". `MoneyInput`: money input type.

## cn.ts (design system file)
- `cn(...classes)`: merges Tailwind class lists (clsx + tailwind-merge).

## labels.ts
- One `...Labels` map per enum in ../property-os-api/docs/frontend-handoff/API.md section 2 (`propertyTypeLabels`, `unitTypeLabels` "1 BR", `paymentMethodLabels` "ACH bank transfer", `chargeTypeLabels`, `rentStatusLabels`, ...). Status labels come from the design system `statusLabel`.
- `labelOptions(labels)`: `[{ value, label }]` for a Select.
- `plural(count, singular, plural?)`: "1 unit" / "3 units".
- `unitLayout(unitType, bathrooms)`: "1 bd / 1 ba", "Studio / 1 ba", or "3 bd" when bathrooms is null.

## useStoredView.ts
- `useStoredView(key, values, fallback)`: a view choice ("cards" / "table") kept in localStorage; falls back to `fallback` when storage is blocked or the saved value is unknown. Used by Properties and Tenants.

## sort.ts
- `compareNatural(a, b)`: numeric-aware, case-insensitive compare ("2" before "10"). Used for every unit number sort and by `useClientTable` text columns.

## forms.ts
- `applyServerError(setError, error, fieldNames)`: backend messages starting with a field name go under that field; returns the others for an InlineError at the top. Works with string or array messages.

## useClientTable.ts
- `useClientTable({ rows, searchText, initialFilters, matchFilters, sorts, initialSort, pageSize })`: search, filters, sort (text / number / money via `toCents` / "YYYY-MM-DD" date) and 25-row pages in memory. Back to page 1 on search or filter change. Returns `pageRows`, `showPagination`, `summary`, `clearFilters`, `isFiltered`...
- `SortKind`, `SortColumn`: sort column types.
