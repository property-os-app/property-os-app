# PropertyOS admin portal

The web app for a US landlord (Owner) and their Property Managers: properties, units, tenants, leases, the rent roll with
each lease's ledger (charges, payments, voids), and a dashboard. It talks to the PropertyOS backend (`property-os-api`)
and signs users in with Firebase.

## Stack

- React 19, TypeScript, Vite (Rolldown), React Router 8 (data mode, lazy-loaded pages)
- TanStack Query for server data, React Hook Form + Zod for forms
- Tailwind CSS v4 (CSS-first, no config file) and the client's design system "propos-ui", copied into `src/components`
- Radix Dialog (modals and drawers), lucide-react icons, Sonner toasts
- Firebase Auth (email and password)

## Prerequisites

- Node 24 and npm
- The backend repo next to this one, running locally: `C:\git\property-os-api` (its README explains how to start it).
  Its API docs, in `../property-os-api/docs/frontend-handoff/`, are the only source of truth for endpoints and fields.
- A Firebase project with Email/Password sign-in enabled, the same project the backend verifies tokens against.

## Setup

```powershell
npm install
```
Installs the dependencies.

```powershell
copy .env.example .env.local
```
Creates your local settings file. Fill in the 5 values (the comments in the file say where each comes from).

```powershell
npm run dev
```
Starts the app on http://localhost:5173. The port is fixed: the backend's CORS only allows 5173.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload on port 5173. |
| `npm run build` | Type-checks (`tsc -b`) and builds to `dist/`. |
| `npm run lint` | ESLint, including the React Compiler and hooks rules. |
| `npm test` | Unit tests (Vitest, runs once) for the money, date, permission and URL helpers. Time zone pinned to UTC; some tests also run in America/New_York. |
| `npm run preview` | Serves the `dist/` build locally. |

## Structure

| Folder | What is in it |
| --- | --- |
| `src/app` | Router, layout (shell, sidebar, menu), providers, query client, error and not-found pages. |
| `src/features/<area>` | One folder per area (auth, dashboard, properties, units, tenants, leases, ledger, rent-roll, scope, settings, shared): pages, hooks for the API, forms and the numbers the page computes. |
| `src/lib` | Plain helpers: env, Firebase, the API client, formatting (money, dates), labels, table and URL helpers. |
| `src/types` | TypeScript types of the API responses and request bodies. |
| `src/components` | The design system (atoms, molecules, organisms, templates). Its `README.md` is the catalog and the log of every change we made to it. |
| `src/styles`, `src/tokens` | Design system theme (light and dark) and tokens. |
| `docs/` | Project brief, design system README and reference pages (reference only, never imported). |

Every folder we write under `src/` has a `README.md` with a line per file and export.

## Conventions

- UI only from the design system in `src/components`; no other UI library. Theme classes only (`bg-surface-1`,
  `text-text-secondary`), never hard-coded colors, so dark mode keeps working.
- Real API only. Never invent endpoints or fields; anything missing becomes a "BACKEND REQUEST".
- Money from the API is a string: format with `src/lib/format.ts`, add and compare in integer cents, never float math.
- Dates are "YYYY-MM-DD": parse with `parseDateOnly`, never `new Date("YYYY-MM-DD")`.
- Every list has loading, empty and error states; every form shows the backend's message (a string or an array).
- List filters, search, sort and page live in the URL, so Back, refresh and shared links keep them.
- Secrets only in `.env.local` (never committed). `.env.example` has empty placeholders.

## Not in this version yet

- Tenant portal (tenants can't sign in to anything yet).
- Expenses, finance, reports, maintenance, vendors, inbox and chat, audit log, activity timeline.
- E-signature (the lease shows a signature status only), file uploads, CSV export, rent reminders, AI features.
- Settings beyond the theme (profile, notifications, team management).
