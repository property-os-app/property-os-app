\# PropertyOS frontend brief (12 Oct 2026)



\## 2. THE PRODUCT

\- PropertyOS: property management app for a US landlord client. Two frontends: this ADMIN portal (Owner + Property Managers) now. The TENANT portal is later, not now.

\- First delivery: about 2 weeks total. Goal: a demo where the main features work end to end against the real API.

\- IN SCOPE: login, app layout, Properties, Units, Tenants, Leases, Rent Roll (with ledger drawer, Add Charge, Record Payment), Settings (Appearance: theme only for now). Optional bonus at the very end: a Dashboard built only from existing endpoints.

\- OUT OF SCOPE: Expenses, Finance, Reports, Maintenance, Vendors, Inbox, Chat, Audit Log, Backup, Activity Timeline, AI features, reminders, export CSV, file uploads, e-sign, tenant portal.



\## 3. DECISIONS (final, they replace anything older)

\- LOOK: the light theme from the client's design system "propos-ui" (white/grey background, GREEN primary). NOT dark, NOT purple. Ignore older dark/purple mockups and any Figma Make plan. Old mockups are only a reference for which fields and columns exist.

\- Build with propos-ui components. Do NOT install shadcn/ui (two component systems would fight).

\- Build against the REAL API from day one. No mock data layer (the backend is done). Still keep one hook per area so pages stay clean.



\## 4. THE DESIGN SYSTEM (propos-ui, README = docs/design-system.md)

\- React + TypeScript + Tailwind v4 (CSS-first, no tailwind.config) + @radix-ui/react-dialog + class-variance-authority + clsx + tailwind-merge + lucide-react + sonner. Font: Plus Jakarta Sans (Google Fonts link in index.html).

\- Atomic design:

&#x20; - atoms: Button, LinkButton, Badge, Tag, Count, Delta, Typography (H1, H2, Num, Dash...), Input, Textarea, Select, CurrencyInput, Checkbox, Toggle, Avatar, Skeleton, Divider, CollectionProgress, Bar, Ring

&#x20; - molecules: StatusBadge, FormField, SearchInput, SegmentedControl, Tabs, FilterChip, Card, KpiCard, HeroStatCard, KeyValueList, EmptyState, InlineError, Banner, Toaster + toast, Stepper, FileDropzone, KebabMenu

&#x20; - organisms: Sidebar (role-aware, renderLink for the router), Topbar, PageHeader, Toolbar, KpiRow, DataTable (5 states: loading/empty/error/ideal, sort, selection, totals row), Pagination, Drawer, Modal, ConfirmDialog, charts

&#x20; - templates: WorkspaceShell (admin layout), AuthLayout (login), others not needed now

&#x20; - pages (reference only, in docs/reference/pages): DashboardPage, RentRollPage (shows the ledger drawer + Record Payment pattern), RenterHomePage

\- Rules from its README to follow: one primary button per view (last in PageHeader actions); status never by color alone (use StatusBadge); a Drawer is for one record from a list, a Modal may open over a drawer, drawers never stack; destructive actions use ConfirmDialog; every list uses DataTable's 5 states; toasts are past tense and specific; numbers use tabular figures; empty values render Dash.

\- Do not edit design system components casually. If one needs a change for our data, change it in one place and say why.



\## 5. PROJECT SETUP AND FOLDERS

\- Design system copied from the zip: src/components, src/lib, src/styles, src/tokens -> same paths in the app. src/pages -> docs/reference/pages (reference only). README.md -> docs/design-system.md.

\- NOT copied: src/demo, src/index.ts, package.json, vite.config.ts, tsconfig.json, index.html. Needed settings were copied instead:

&#x20; - path alias "@" -> "src" in vite.config.ts AND tsconfig (the design system imports "@/components/...", "@/lib/cn").

&#x20; - @tailwindcss/vite plugin in vite.config.ts.

&#x20; - src/index.css becomes only: @import "./styles/theme.css";  (theme.css already imports tailwindcss).

&#x20; - Plus Jakarta Sans font link in index.html.

\- App code folders:

&#x20; - src/app/ (router, providers, auth guard)

&#x20; - src/lib/ (design system cn.ts + format.ts, plus our env.ts, firebase.ts, api.ts)

&#x20; - src/types/ (API response types)

&#x20; - src/features/<area>/ (properties, units, tenants, leases, rent-roll, auth): hooks.ts (TanStack Query), pages, area-specific components

\- Env: .env.local (gitignored) with VITE\_API\_URL=http://localhost:3000 and VITE\_FIREBASE\_API\_KEY, VITE\_FIREBASE\_AUTH\_DOMAIN, VITE\_FIREBASE\_PROJECT\_ID, VITE\_FIREBASE\_APP\_ID. Commit only .env.example with empty placeholders.

\- The backend runs locally with npm run start:dev on port 3000. Vite runs on 5173 (strictPort). CORS is enabled for http://localhost:5173.



\## 6. ADAPT THE DESIGN SYSTEM TO OUR BACKEND

\- Roles: backend OWNER -> Sidebar role "admin"; PROPERTY\_MANAGER -> "manager". The other design-system roles (leasing, maintenance, accountant) don't exist. TENANT is not allowed in this portal.

\- Sidebar: pass custom groups with only built modules: Leasing (Properties, Units, Tenants, Leases), Money (Rent Roll). Add Dashboard only if the bonus gets built. The Active Property selector (scope) filters lists by propertyId where the API supports it (units, leases, rent roll).

\- StatusBadge: add our statuses (keep the tone idea):

&#x20; - Rent: PAID success, PARTIAL warning, UNPAID warning, OVERDUE danger, NOT\_BILLED neutral. (No "Late", no "Vacant" rows.)

&#x20; - Lease: DRAFT neutral, ACTIVE success, ACTIVE with endingSoon=true shown as "Expiring" warning, ENDED neutral, TERMINATED danger. (No month-to-month: every lease has an end date.)

&#x20; - Unit: VACANT neutral, OCCUPIED success, RESERVED info, UNDER\_MAINTENANCE warning.

&#x20; - E-sign: NOT\_SENT neutral, PENDING warning, SIGNED success.

&#x20; - Show friendly labels (e.g. "Not billed", "Under maintenance"), map from the enum.

\- lib/format.ts (fix it, don't add a second money/date helper):

&#x20; - Money from the API is a STRING ("1200.00", "-150.00", may be "2500" or "2500.5"). formatCurrency must accept these strings, handle negatives (-$150.00) and never use float math for calculations (integer cents if you must add).

&#x20; - formatDate must NOT do new Date("YYYY-MM-DD") (it shows the previous day in US time zones). Parse the first 10 characters as year/month/day. Works for "2026-11-01" and full ISO strings.

&#x20; - leaseCountdown has the same date problem: fix it the same way.

\- Record Payment modal (from RentRollPage): remove the "partial payment" checkbox (not a backend concept). Methods: ACH, CHECK, CREDIT\_CARD, CASH, OTHER. Overpayment is allowed: don't cap the amount; if it exceeds the balance, show "This leaves a credit of $X".

\- Rent Roll KPIs: use our summary fields only (see section 7). Drop On-time rate, Vacancy loss, Autopay, Last reminder, Documents tab.

\- No pagination in the API: paginate on the client if a list gets long.



\## 7. API CONTRACT (real, built and tested)

The API docs live in the backend repo. See docs/API-DOCS.md.



\## 8. ROLES IN THE UI (backend is the real guard; the UI only hides things)

\- OWNER: everything.

\- PROPERTY\_MANAGER: no create/edit/delete of properties, no manager assignment, no deleting units or tenants, no voiding. Can create/edit units and leases only on assigned properties, can add charges and record payments there, can create/edit any tenant.

\- TENANT signing in here: show "This portal is for staff" and sign out.

\- Hide (don't disable) actions the role can't use, as the design system rules say.



\## 9. AUTH FLOW (Firebase JS SDK in the browser)

\- Sign in with email + password. Require a verified email.

\- auth.currentUser is null until Firebase restores the session: export an authReady promise (first onAuthStateChanged) and await it before reading the token.

\- Get the token with user.getIdToken() (the SDK refreshes it; tokens last about 1 hour). Send Authorization: Bearer <token>.

\- After sign-in call GET /auth/me for the role. If the user isn't registered in the backend yet, show a message (registration is done from Postman for now). Never let the public pick a role.

\- TanStack Query: don't retry 400/401/403/404/409; retry others once. On 401, sign out and go to login.

\- Login page: AuthLayout template.



\## 10. SCREENS (fields; look comes from propos-ui, layout = PageHeader + KpiRow + Toolbar + DataTable + Drawer/Modal)

\- Properties list: name, address (street, city, state, zip), type, value, unit count, managers. Drawer: details + managers + units. Add Property modal: name, street, city, state, zip, property type, property value, acquisition date, assigned managers (multi-select from GET /managers, Owner only, optional), description, "number of units" (NOT saved: after create, open Add Unit that many times in a row). File attachments: hidden.

\- Units list (filter by property): unit number, property, type, floor area, floor, bathrooms, monthly rent, status. Add Unit modal: unit number, unit type (Studio/1BR/2BR/3BR/4BR), floor area (sqft), floor, bathrooms, monthly rent, status (Vacant/Reserved/Under maintenance only), description.

\- Tenants: tab 1 "Tenants in my properties" (from leases: tenant, contact, property, unit, lease number, deposit, balance, status), tab 2 "All tenants" directory (GET /tenants, with "created by"). Add Tenant modal: full name\*, email\*, phone\*, ID/passport number, address, tenant type\* (Individual/Company), move-in date, preferred contact method (Email/Phone/SMS), notes. Attachment boxes: hidden.

\- Leases list: tenant, unit, property, start, end, term, rent, deposit, frequency, auto-renew, status, e-sign, balance, tags. Add Lease modal: property (only filters the unit list) + unit\*, primary tenant (picker from GET /tenants with search, plus "add new"), co-tenants (optional), start\*, end\*, lease term (3/6/9/12/24 months fills end), payment frequency (Monthly for now), monthly rent\* (prefilled from the unit, editable), deposit\*, late fee + grace days, rent due day (1-31), auto-renew toggle, tags (suggestions + custom), notes. Save as Draft or Create \& Activate. Lease drawer: details, tenants, Activate / End / Delete draft actions, signature status.

\- Rent Roll: month picker, KPI cards from the summary, status filter (SegmentedControl), search, Generate rent button, table rows. Row opens the ledger drawer: name, unit, status, mini cards (monthly rent, paid, balance), Ledger tab with running balance, Add Charge and Record Payment buttons, Void (Owner only, ConfirmDialog with a reason). Use docs/reference/pages/RentRollPage.tsx as the starting pattern.

\- Dashboard (bonus, last): rent collection hero from the rent-roll summary, occupancy from units, leases expiring (endingSoon count), overdue tenants (overdueCount). Hide maintenance, income/expenses chart and AI panels.



\## 11. WORKING RULES

\- See CLAUDE.md at the repo root. It is the source of truth for how to work in this repo.



\## 12. ORDER OF WORK (one step per Claude Code session; the user tests and commits after each)

\- Setup part 1: packages, Tailwind, alias, font, CLAUDE.md (done).

\- Setup part 2: connect the design system, env.ts, firebase.ts (authReady), api.ts (apiFetch, ApiError), fix lib/format.ts, QueryClient + Toaster + router (library mode), one test page.

\- Login (AuthLayout) + auth guard + WorkspaceShell layout with our Sidebar groups and role mapping.

\- Properties (list, drawer, add/edit, managers).

\- Units.

\- Tenants (tab 2 directory first, then tab 1 from leases).

\- Leases (list, add/edit, draft, activate, end).

\- Rent Roll (table, generate, ledger drawer, Add Charge, Record Payment, Void).

\- Polish for the demo (empty/loading/error states, toasts, money and dates everywhere), then Dashboard bonus if time allows.



\## 13. OPEN QUESTIONS

\- Exact deadline and days left. Laptop demo or live URL. Exact JSON shapes (real samples go in ../property-os-api/docs/frontend-handoff/api-samples). Whether the Properties and Units list screens have their own designs (none seen: build them from the design system patterns).

