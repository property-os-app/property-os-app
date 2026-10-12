# src/app

App wiring: providers, router, query cache and app-level pages (not found, missing config). Feature pages live in `src/features/<area>`.

## providers.tsx
- `Providers`: the app root. Wraps everything in `QueryClientProvider`, mounts the design system `Toaster` once, and renders `RouterProvider`.

## router.tsx
- `router`: all routes, made with `createBrowserRouter` (React Router library / data mode). `/` -> DevCheckPage, `*` -> NotFoundPage.

## queryClient.ts
- `queryClient`: the shared TanStack Query cache. Queries don't retry on ApiError 400/401/403/404/409 and retry once otherwise; mutations never retry.

## NotFoundPage.tsx
- `NotFoundPage`: "Page not found" empty state with a button back to `/`.

## EnvErrorPage.tsx
- `EnvErrorPage`: rendered by `main.tsx` instead of the app when env variables are missing; lists them and says how to fix it.

## DevCheckPage.tsx (temporary, delete in the next step)
- `DevCheckPage`: checks GET /health, shows format helper outputs, Firebase auth state, and a test toast button.
