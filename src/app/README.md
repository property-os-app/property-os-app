# src/app

App wiring: providers, router, query cache, the signed-in layout and app-level pages (not found, errors, missing config). Feature pages live in `src/features/<area>`.

## providers.tsx
- `Providers`: the app root. `ThemeProvider` > `QueryClientProvider` > `AuthProvider` > the design system `Toaster` (mounted once, top center so it never covers drawer or modal footers) + `RouterProvider`.

## router.tsx
- `router`: all routes, made with `createBrowserRouter` (React Router library / data mode).
  - Public (inside `PublicOnly`): `/login`, `/forgot-password`.
  - Signed in (inside `RequireAuth` + `AppLayout`): `/` redirects to `/properties`; `/properties` (`PropertiesPage`), `/properties/:id` (`PropertyDetailPage`); `/units` (`UnitsPage`); `/tenants` (`TenantsPage`); `/leases` (`LeasesPage`); `/rent-roll` (`RentRollPage`); `/settings` (`SettingsPage`); `*` shows `NotFoundPage`.
  - `errorElement`: `RouteErrorPage` inside the shell for page errors, full page for anything above it.
  - Each page route has a `handle` (`RouteHandle`) with its title and Sidebar item.

## AppLayout.tsx
- `AppLayout`: `ScopeProvider` + `WorkspaceShell` + `<Outlet />`. Sidebar gets our Leasing / Money / Admin (Settings) groups (icons reused from `defaultNavGroups`), the role, name and role label from GET /auth/me, the scope label, and React Router links. Topbar gets the page title, the scope chip, no AI, and a profile menu (email, Settings, Sign out). Sets the tab title. Provides `PageTitleContext`, so a page can replace the route title.
- `RouteHandle`: `{ title, nav? }`, put on a route as `handle`.

## queryClient.ts
- `queryClient`: the shared TanStack Query cache. Queries don't retry on ApiError 400/401/403/404/409 and retry once otherwise; mutations never retry. On `MISSING_TOKEN` / `INVALID_TOKEN` (any query or mutation) it shows "Your session ended..." once and signs out. Never for `USER_NOT_REGISTERED`.

## NotFoundPage.tsx
- `NotFoundPage`: "Page not found" empty state with a button back to `/`. Renders inside the app layout.

## RouteErrorPage.tsx
- `RouteErrorPage`: router `errorElement`, an InlineError and a Reload button. `fullPage` when outside the shell.

## EnvErrorPage.tsx
- `EnvErrorPage`: rendered by `main.tsx` instead of the app when env variables are missing; lists them and says how to fix it.

## pageTitle.ts
- `usePageTitle(title)`: a page shows its own title (e.g. the property name) in the Topbar and tab instead of the route title.
- `PageTitleContext`: the setter, provided by `AppLayout`.
