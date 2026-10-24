# src/app

App wiring: providers, router, query cache, the signed-in layout and app-level pages (not found, errors, missing config). Feature pages live in `src/features/<area>`.

## providers.tsx
- `Providers`: the app root. `ThemeProvider` > `QueryClientProvider` > `AuthProvider` > the design system `Toaster` (mounted once, top center so it never covers drawer or modal footers) + `RouterProvider`.

## router.tsx
- `router`: all routes, made with `createBrowserRouter` (React Router library / data mode). Every page (and the login pages) is a lazy route: its code downloads the first time it opens. First app load shows `PageSkeleton` (login pages: `FullPageLoading`) while it downloads; a failed download shows `RouteErrorPage`.
  - Public (inside `PublicOnly`): `/login`, `/forgot-password`.
  - Signed in (inside `RequireAuth` + `AppLayout`): `/` (`DashboardPage`, title "Dashboard"); `/properties` (`PropertiesPage`), `/properties/:id` (`PropertyDetailPage`); `/units` (`UnitsPage`); `/tenants` (`TenantsPage`); `/leases` (`LeasesPage`), `/leases/:id` (`LeasePage`, title "Lease {number}", sidebar Leases, or Rent Roll when opened from it); `/rent-roll` (`RentRollPage`); `/settings` (`SettingsPage`, General), `/settings/users` (`UsersPage`, title "Users and Permissions", owner only), `/settings/templates` (`TemplatesPage` from `features/lease-templates`, title "Lease templates", Owner and managers); `*` shows `NotFoundPage`.
  - `errorElement`: `RouteErrorPage` inside the shell for page errors, full page for anything above it.
  - Each page route has a `handle` (`RouteHandle`) with its title and Sidebar item.

## AppLayout.tsx
- `AppLayout`: `ScopeProvider` + `WorkspaceShell` + `<Outlet />` + `<ScrollRestoration />` (Back restores the window scroll, a new page starts at the top). Shows `PageSkeleton` while a page's code downloads. Owns the mobile menu open state (closes on any page change) so a later phone tab bar can open the same menu. Sidebar gets our Overview (Dashboard) / Leasing / Money / Admin (Settings) groups (icons reused from `defaultNavGroups`), the role, name and role label from GET /auth/me, the scope label, and React Router links. Topbar gets the page title, the scope chip, no AI, a `ThemeSwitch` left of the avatar (flips the theme showing now, also from "system", with a circular reveal via `changeThemeWithReveal`), and a profile menu (email, Settings, Sign out). Sets the tab title. Provides `PageTitleContext` and `PageNavContext`, so a page can replace the route title and the highlighted Sidebar item.
- `RouteHandle`: `{ title, nav? }`, put on a route as `handle`.

## queryClient.ts
- `queryClient`: the shared TanStack Query cache. Queries don't retry on ApiError 400/401/403/404/409 and retry once otherwise; mutations never retry. On `MISSING_TOKEN` / `INVALID_TOKEN` (any query or mutation) it shows "Your session ended..." once and signs out. Never for `USER_NOT_REGISTERED`. On 403 `FORBIDDEN_PERMISSION` it reloads GET /auth/me (`["me"]`), so buttons the user lost hide right away; the form still shows the backend message.

## NotFoundPage.tsx
- `NotFoundPage`: "Page not found" empty state with a button back to `/`. Renders inside the app layout.

## RouteErrorPage.tsx
- `RouteErrorPage`: router `errorElement`, an InlineError and a Reload button. `fullPage` when outside the shell. A page file that failed to download ("Failed to fetch dynamically imported module", e.g. after a new deploy) gets "This page couldn't load".

## PageSkeleton.tsx
- `PageSkeleton`: header, KPI row, toolbar and table-row skeletons, shown while a lazy page loads.

## EnvErrorPage.tsx
- `EnvErrorPage`: rendered by `main.tsx` instead of the app when env variables are missing; lists them and says how to fix it.

## pageTitle.ts
- `usePageTitle(title)`: a page shows its own title (e.g. the property name) in the Topbar and tab instead of the route title.
- `PageTitleContext`: the setter, provided by `AppLayout`.
- `usePageNav(nav)`: a page highlights another Sidebar item than its route `handle.nav` (a lease opened from the Rent Roll). `PageNavContext`: its setter, provided by `AppLayout`.
