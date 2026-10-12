# @propos/ui

The PropOS design system as React + TypeScript + Tailwind v4 components, organised by atomic design. Light theme is the default; dark is a `.dark` class on `<html>`. Every value comes from the PropOS UI/UX guideline (tokens, type scale, status colors, page anatomy, five states).

```
src/
  styles/theme.css        Tailwind v4 @theme: colors, type scale, radii, layout widths, motion, animations
  tokens/                 The same tokens as JS (for charts, canvas, email)
  lib/cn.ts               clsx + tailwind-merge, taught the custom type scale and tokens
  lib/format.ts           Currency, percent, date, relative time, lease countdown, initials
  components/
    atoms/                Button, LinkButton, Badge, Tag, Count, Delta, Typography (HeroStat … Overline),
                          Input, Textarea, Select, CurrencyInput, Checkbox, Toggle, Kbd, Avatar, Skeleton,
                          Divider, CollectionProgress, Bar, Ring
    molecules/            StatusBadge (domain status map), FormField, SearchInput, SegmentedControl, Tabs,
                          FilterChip, Card, CardHeader, KpiCard, HeroStatCard, InternalNote, KeyValueList,
                          EmptyState, InlineError, Banner, AiActionItem, AiHeading, TimelineItem, TimelineDay,
                          ChatBubble, Toaster + toast, Stepper, StatusTracker, FileDropzone, KebabMenu
    organisms/            Sidebar (role-aware), Topbar, PageHeader, Toolbar, KpiRow, DataTable, Pagination,
                          Drawer, Modal, ConfirmDialog, KanbanBoard, IncomeExpenseChart, DonutChart, HBarList,
                          RentCollectionHero, AiActionPanel, AiCommandCenter, ActivityTimeline,
                          RenterTabBar, OwnerNav
    templates/            WorkspaceShell, OwnerShell, RenterShell, AuthLayout, SettingsLayout, ThreePaneLayout
  pages/                  Example compositions: DashboardPage, RentRollPage, RenterHomePage
  demo/                   Vite demo with a component gallery (npm run dev)
```

Atoms know nothing about the domain. Molecules combine atoms into one job (a form field, a KPI card). Organisms are the sections a page is built from and own no data. Templates lay organisms out into the three shells. Pages are the only layer that holds state and data; copy them into your app and replace the sample data with your queries.

## Install

```bash
npm i @radix-ui/react-dialog class-variance-authority clsx lucide-react sonner tailwind-merge
# Tailwind v4
npm i -D tailwindcss @tailwindcss/vite   # or @tailwindcss/postcss
```

Copy `src/` into your app (or publish it as a workspace package) and set the `@/*` path alias to that folder (see `tsconfig.json` and `vite.config.ts`).

In your global CSS, import the theme once instead of `@import "tailwindcss"` (the theme file already includes it):

```css
@import "@propos/ui/src/styles/theme.css";
```

Load the typeface in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
```

Mount `<Toaster />` once near the app root.

## Try the demo

```bash
npm install
npm run dev        # http://localhost:5173  (#dashboard, #rent-roll, #renter, #gallery)
npm run typecheck
```

## Tokens

The raw values live on `:root` (light) and `.dark` as plain CSS variables; `@theme inline` maps them to Tailwind utilities, so switching theme at runtime is a class toggle and every component follows.

| Use it as | Examples |
| --- | --- |
| Colors | `bg-bg` `bg-surface-1/2/3` `bg-overlay` `border-border-subtle` `border-border-strong` `text-text-primary/secondary/muted` `bg-success` `text-success-fg` `bg-success-soft` `text-danger` `bg-warning-soft` `text-info` `text-ai` `bg-ai-soft` `bg-scrim` |
| Type scale | `text-hero` (48/56/800) `text-display` (32/40/800) `text-h1` `text-h2` `text-h3` `text-body` `text-body-lg` (16/24, Renter Portal) `text-small` `text-caption` `text-overline` (add `uppercase`) |
| Radii | `rounded-badge` 6 · `rounded-control` 8 · `rounded-card` 12 · `rounded-overlay` 16 · `rounded-pill` |
| Layout | `w-sidebar` 264 · `w-sidebar-collapsed` 72 · `h-topbar` 64 · `w-drawer` 480 · `w-drawer-lg` 640 · `w-drawer-xl` 800 · `w-modal` 480 · `w-modal-lg` 640 · `max-w-content` 1440 |
| Motion | `duration-fast` 120ms · `duration-overlay` 240ms · `duration-draw` 600ms · `ease-overlay` · `animate-hazard` · `animate-shimmer` |
| Extras | `hazard-fill` (collection bar stripes) · `focus-ring` (2px green at 40%) · `shadow-overlay` · `tabular` |

Light values: bg `#f7f7f9`, surfaces `#ffffff` / `#f1f1f4` / `#e9e9ee`, borders `#e4e4ea` / `#cfcfd8`, text `#0b0b0f` / `#52525e` / `#6f6f7c`, success `#059669`, danger `#e11d48`, warning `#b45309`, info `#0284c7`, AI `#7c3aed`. Dark values are the guideline's original dark palette. Text on a solid green button is always `text-success-fg` (`#04130d`), never white.

Chart colors are fixed by the guideline: income green, expenses sky blue, net line text-primary, then amber, red, grey. `chartPalette()` in `tokens/` returns them in that order for Recharts or any other library.

## Rules the components enforce

- Status is never color alone: `Badge` renders a leading dot (or icon) plus the label; `StatusBadge` maps every domain status (rent, lease, e-sign, ticket, priority, unit, insurance, approval) to its tone so feature code never picks colors.
- One primary button per view: `PageHeader` takes `actions`; put the primary last.
- Hidden, not disabled: `Sidebar` removes modules the role cannot use (`roleModules`), so view-only roles see the same layout with fewer controls.
- Drawers never stack: `Drawer` is for one record from a list; `Modal` may open over a drawer (Record Payment from the ledger). Both trap focus, close on Escape and return focus (Radix Dialog). Under 768px the drawer becomes a full-screen sheet and the modal a bottom sheet.
- Destructive actions confirm: `ConfirmDialog` names the consequence and can require typing the record name.
- Five states: `DataTable` takes `state="loading" | "empty" | "error" | "ideal"` and renders shimmer rows, `EmptyState` or `InlineError` with Retry.
- Kanban cards can be moved without dragging: every card has a "Move to" menu.
- Toasts are past tense and specific; errors persist until dismissed (`toast.error`).
- AI actions never send without a preview: `AiActionPanel.onAction` should open a `Modal` listing recipients and the message (see `DashboardPage`).
- Numbers use tabular figures (`tabular` on `<table>` by default, `Num` for inline values), empty values render `Dash`, formats come from `lib/format.ts`.

## Routing

Navigation components render plain `<a href>` by default. Pass `renderLink` to `Sidebar` to use your router:

```tsx
<Sidebar renderLink={(href, props) => <Link to={href} {...props} />} … />
```

## Dark theme

```ts
document.documentElement.classList.toggle("dark", userPrefersDark);
```

Nothing else changes. Export surfaces (CPA Summary PDF) should render inside an element without `.dark` so they stay light and print-friendly.
