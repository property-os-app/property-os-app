# Design system catalog (propos-ui)

propos-ui is the client's React + Tailwind v4 component library, organised by atomic design: atoms → molecules → organisms → templates. Components hold no data; our pages in `src/features` fetch data and pass it in. Light theme, green primary, Plus Jakarta Sans. Full rules (one primary button per view, status never by color alone, drawers never stack, five table states, toast wording): [docs/design-system.md](../../docs/design-system.md).

Import from the layer index, e.g. `import { Button } from "@/components/atoms"`.
Example pages (reference only, never import): `docs/reference/pages/`.

---

## Atoms

Small building blocks with no domain knowledge.

| Component | What it does | Main props | When to use |
| --- | --- | --- | --- |
| `Button` | Button with variants | `variant` primary/secondary/ghost/danger/ai, `size` sm/md/lg, `icon`, `iconRight`, `iconOnly`, `block` | Any action. One `primary` per view. |
| `LinkButton` | `<a>` styled as a button | same variants + `href` | Navigation that looks like a button. |
| `Badge` | Pill with a dot or icon plus a label | `tone` success/warning/danger/info/neutral/ai, `icon`, `dot` | Low-level; for statuses use `StatusBadge`. |
| `Tag` | Outline pill, optional remove button | `onRemove` | Lease tags. |
| `Count` | Small number bubble | `tone` neutral/danger/success | Counts in nav, tabs, segments. |
| `Delta` | Up/down/flat chip | `direction` | Change indicator on a KPI. |
| `HeroStat`, `Display` | 48px / 32px numbers | `as`, `className` | Hero and KPI values. |
| `H1`, `H2`, `H3` | Headings 24 / 20 / 16px | `as` | Page / section or drawer / card titles. |
| `Body`, `Small`, `Caption`, `Overline` | Body 14, helper 13, meta 12, uppercase label 11 | `as` | All text. |
| `Num` | Span with tabular figures | - | Inline money and numbers. |
| `Dash` | Muted "-" | - | Any empty value (never "N/A"). |
| `Input`, `Textarea` | Text fields | `invalid`, `mobile` (Input) | Form fields, inside `FormField`. |
| `Select` | Native select with chevron | `invalid`, `<option>` children | Single choice from a short list. |
| `CurrencyInput` | "$" prefix, right-aligned, formats on blur | `value: number \| ""`, `onChange(number \| "")` | Money inputs (rent, deposit, payment). |
| `Checkbox` | Styled checkbox with label | `label`, native checkbox props | Yes/no inside a form. |
| `Toggle` | 40×22 switch | `checked`, `onChange(boolean)`, needs `aria-label` | On/off settings (auto-renew). |
| `Kbd` | Keyboard hint (⌘K) | - | Shortcut hints. |
| `Avatar` | Initials or image circle | `name`, `src`, `size` 24/32/40/56, `online` | People in lists and the sidebar. |
| `Skeleton` | Shimmer block | `className` for size | Loading placeholders (no spinners). |
| `Divider` | 1px line | - | Separating sections. |
| `CollectionProgress` | 16px striped bar + % | `value` 0-100, `label` | Rent collection rate. |
| `Bar` | Thin 8px bar | `value`, `tone` | Occupancy and similar ratios. |
| `Ring` | Circular 0-100 score | `value`, `size` | Portfolio health score. |

## Molecules

Atoms combined to do one job.

| Component | What it does | Main props | When to use |
| --- | --- | --- | --- |
| `StatusBadge` | Maps a domain status to a tone | `domain` rent/lease/esign/ticket/priority/unit/insurance/approval, `status`, `children` (label override) | Every status in a table or drawer. |
| `FormField` | Label, control, help or error text | `label`, `htmlFor`, `required`, `help`, `error`, `action` | Wrap every form control. |
| `SearchInput` | Input with a search icon | Input props, `shortcut` | Toolbar search. |
| `SegmentedControl` | Button group with counts | `value`, `onChange`, `segments`, `aria-label` | Status filter (Rent Roll). |
| `Tabs` | Underline tabs with counts | `value`, `onChange`, `tabs` | Drawer tabs, Tenants page tabs. |
| `FilterChip` | Pill filter, removable when active | `active`, `count`, `onRemove` | Applied filters in a toolbar. |
| `Card` | White bordered surface | `padding` none/compact/default, `as` | Grouping content. |
| `CardHeader` | Card title row | `title`, `description`, `action` | Top of a card. |
| `KpiCard` | Label + big value + delta/note | `label`, `value`, `tone`, `delta`, `note`, `onClick`/`href` | KPI row cards. |
| `HeroStatCard` | Big stat with colored top border | `label`, `value`, `note`, `tone` | Total due / collected / outstanding. |
| `KeyValueList` | Two-column label/value grid | `items`, `labelWidth` | Details in drawers. |
| `InternalNote` | Amber "not visible to tenant" note | `author`, `date` | Staff-only notes. |
| `EmptyState` | Icon, title, sentence, action | `icon`, `title`, `description`, `action` | Empty lists (used by DataTable). |
| `InlineError` | Error box with Retry | `title`, `description`, `onRetry` | Failed loads (used by DataTable). |
| `Banner` | Amber strip under the top bar | `children`, `action` | Unsaved / offline notice. |
| `Toaster` + `toast` | Sonner toasts, styled | `toast.success/error/info(message, opts)` | Mount `Toaster` once; toast after saves. Errors stay until dismissed. |
| `Stepper` | Horizontal numbered steps | `steps`, `current` | Multi-step modals. |
| `StatusTracker` | Vertical steps | `steps`, `current` | Renter ticket progress. |
| `FileDropzone` | Drag-and-drop upload list | `files`, `onFiles`, `onRemove` | File uploads. |
| `KebabMenu` | "⋮" row actions menu | `items` (label, icon, onSelect, destructive) | Row actions in tables. |
| `AiActionItem`, `AiHeading` | AI finding row / AI card header | `finding`, `reason`, `onAction` | AI surfaces. |
| `TimelineItem`, `TimelineDay` | Activity row / day header | `icon`, `tone`, `meta` | Activity feeds. |
| `ChatBubble` | Message bubble | `mine`, `meta` | Chat. |

## Organisms

Page sections. They own no data.

| Component | What it does | Main props | When to use |
| --- | --- | --- | --- |
| `Sidebar` | Left nav, filtered by role | `role`, `active`, `user`, `scope`, `onScopeClick`, `groups`, `renderLink`, `badges`, `collapsed` | Inside `WorkspaceShell`. |
| `Topbar` | 64px top bar: title, scope chip, search, AI, bell, quick add, avatar | `title`, `scope`, `user`, `showAi`, `onQuickAdd`, `onProfile`, `onSearch` | Inside `WorkspaceShell`. |
| `PageHeader` | Page title, description, actions | `title`, `description`, `actions`, `breadcrumb` | Top of every page. Primary action last. |
| `Toolbar` | Wrapping row | `children` | Search + filters above a table. |
| `KpiRow` | Grid of up to 4 cards | `children` | Row of `KpiCard`s. |
| `DataTable` | Table with 5 states, sort, selection, totals | `columns`, `rows`, `rowKey`, `state`, `empty`, `error`, `onRowClick`, `sort`/`onSortChange`, `totals`, `footer` | Every list. |
| `Pagination` | Page number buttons | `page`, `pageCount`, `onPageChange`, `summary` | In `DataTable` `footer`. |
| `Drawer` | Right side panel (480/640/800) | `open`, `onOpenChange`, `title`, `status`, `tabs`, `footer`, `size`, `confirmClose` | One record from a list. Never stack. |
| `Modal` | Centered dialog (480/640) | `open`, `onOpenChange`, `title`, `footer`, `size`, `confirmClose` | Create/edit forms; may open over a drawer. |
| `ConfirmDialog` | Confirm modal, optional type-to-confirm | `title`, `consequence`, `confirmLabel`, `onConfirm`, `destructive`, `typeToConfirm` | Every destructive action. |
| `RentCollectionHero` | 3 hero stats + collection bar | `period`, `totalDue`, `collected`, `outstanding`, counts | Dashboard rent block. |
| `IncomeExpenseChart`, `DonutChart`, `HBarList` | Simple SVG/CSS charts | `data` / `slices` / `items`, `format` | Finance charts. |
| `KanbanBoard` | 4-column ticket board | `tickets`, `onOpen`, `onMove` | Maintenance tickets. |
| `AiActionPanel`, `AiCommandCenter` | AI panels | `actions` / `score`, `headline` | AI features. |
| `ActivityTimeline` | Grouped activity feed | `events`, `limit` | Activity page / widget. |
| `RenterTabBar`, `OwnerNav` | Renter and owner portal nav | `active` | Other portals. |

## Templates

Page layouts.

| Component | What it does | Main props | When to use |
| --- | --- | --- | --- |
| `WorkspaceShell` | Sidebar + Topbar + centered main (max 1440) | `sidebar` (SidebarProps), `topbar` (TopbarProps), `banner` | Rendered ONCE by our layout route. Pages never wrap themselves. |
| `AuthLayout` | Form column (max 400px) + optional brand panel | `children`, `aside` | Login page. |
| `OwnerShell` | Top-nav owner portal | `nav` | Not this app. |
| `RenterShell` | Mobile tenant portal | `active`, `header` | Not this app. |
| `SettingsLayout` | Settings sub-nav + content | `sections`, `active` | Settings pages. |
| `ThreePaneLayout` | List / thread / context | `list`, `thread`, `context` | Inbox / chat. |

---

## Styles and tokens

**`src/styles/theme.css`** is the source of truth. It imports Tailwind, defines light (default) and `.dark` colors, and maps them to utilities.

| Kind | Classes |
| --- | --- |
| Background / surfaces | `bg-bg`, `bg-surface-1` (cards), `bg-surface-2` (inputs, headers), `bg-surface-3` (hover), `bg-overlay`, `bg-scrim` |
| Borders | `border-border-subtle`, `border-border-strong` |
| Text | `text-text-primary`, `text-text-secondary`, `text-text-muted` |
| Status | `success` (green #059669, the main color), `danger`, `warning`, `info`, `ai`, each with `-soft`; `text-success-fg` is the dark text on solid green |
| Type scale | `text-hero` 48, `text-display` 32, `text-h1` 24, `text-h2` 20, `text-h3` 16, `text-body` 14, `text-body-lg` 16, `text-small` 13, `text-caption` 12, `text-overline` 11 |
| Radius | `rounded-badge` 6, `rounded-control` 8, `rounded-card` 12, `rounded-overlay` 16, `rounded-pill` |
| Sizes | `w-sidebar` 264, `h-topbar` 64, `w-drawer` 480 / `-lg` 640 / `-xl` 800, `w-modal` 480 / `-lg` 640, `max-w-content` 1440 |
| Extras | `tabular` (number figures), `focus-ring`, `shadow-overlay`, `duration-fast/overlay/draw`, `animate-shimmer`, `hazard-fill` |

**`src/tokens/index.ts`**: the same values as JS (`colors`, `typography`, `spacing`, `radius`, `layout`, `motion`, `chartPalette()`), for places CSS can't reach. Keep in sync with theme.css.

**`src/lib/cn.ts`**: `cn(...classes)` merges class lists (clsx + tailwind-merge, taught our custom classes). Use it for every `className`.

**`src/lib/format.ts`**: `formatCurrency`, `formatCompactCurrency`, `formatPercent`, `formatDate`, `formatRelative`, `leaseCountdown`, `initials`, `EMPTY`. See known gaps below before using.

---

## Used in this project vs not used

Based on docs/BRIEF.md (admin portal: login, Properties, Units, Tenants, Leases, Rent Roll; Dashboard is a bonus).

**Used**
- Atoms: Button, LinkButton, Badge, Tag, Count, Typography (H1-H3, Body, Small, Caption, Overline, Display, Num, Dash), Input, Textarea, Select, CurrencyInput, Checkbox, Toggle, Avatar, Skeleton, Divider, CollectionProgress, Bar
- Molecules: StatusBadge, FormField, SearchInput, SegmentedControl, Tabs, FilterChip, Card, CardHeader, KpiCard, HeroStatCard, KeyValueList, EmptyState, InlineError, Toaster + toast, KebabMenu
- Organisms: Sidebar, Topbar, PageHeader, Toolbar, KpiRow, DataTable, Pagination, Drawer, Modal, ConfirmDialog
- Templates: WorkspaceShell, AuthLayout
- Bonus Dashboard only: RentCollectionHero, HeroStat

**Not used** (out of scope in the brief)
- AI: AiActionItem, AiHeading, AiActionPanel, AiCommandCenter, Ring, Button `variant="ai"`
- Charts: IncomeExpenseChart, DonutChart, HBarList
- Maintenance / chat / activity: KanbanBoard, StatusTracker, ChatBubble, TimelineItem, TimelineDay, ActivityTimeline, ThreePaneLayout
- Other portals: RenterTabBar, OwnerNav, RenterShell, OwnerShell
- Other: FileDropzone (no uploads), SettingsLayout (no settings), InternalNote, Banner, Stepper, Kbd, Delta (no comparison data in the API)

---

## Known gaps for our backend

Facts seen in the code. Nothing fixed yet.

| File | Gap |
| --- | --- |
| `lib/format.ts` | `formatCurrency` and `formatCompactCurrency` take a `number`; the API sends money as strings ("1200.00", "-150.00"). |
| `lib/format.ts` | `formatDate` does `new Date(string)`, so "YYYY-MM-DD" shows the previous day in US time zones. |
| `lib/format.ts` | `leaseCountdown` has the same `new Date(string)` problem, and does float math on milliseconds. |
| `molecules/StatusBadge.tsx` | Statuses are display words ("Paid", "Late", "Month-to-Month", "Under Renovation"), not our enums. Missing: rent UNPAID, NOT_BILLED; lease ENDED, TERMINATED; unit RESERVED, UNDER_MAINTENANCE. Unknown values fall back to neutral and show the raw text. |
| `atoms/Input.tsx` (`CurrencyInput`) | Keeps several dots ("1.2.3" → `NaN`), no 2-decimal limit, no negative values. |
| `organisms/Panels.tsx` (`RentCollectionHero`) | Takes numbers and computes the rate with float math; needs `unitsBilled`, `paymentsReceived`, `lateCount`, which our rent-roll summary doesn't have (it has `collectionRate`, `overdueCount`). |
| `organisms/Sidebar.tsx` | `Role` is admin/manager/leasing/maintenance/accountant (we map OWNER → admin, PROPERTY_MANAGER → manager). Default groups list out-of-scope modules; we must pass our own `groups`. Brand text is "PropOS", not "PropertyOS". Avatar always shows the online dot. |
| `organisms/Topbar.tsx` | Search, bell, quick-add (a second primary button) and avatar always render; `showAi` defaults to `true`. No sign-out or profile menu, only an `onProfile` callback. Search placeholder mentions tickets. |
| `templates/Shells.tsx` (`WorkspaceShell`) | Sidebar is hidden under 768px and there is no mobile nav in its place. |
| `organisms/Overlays.tsx` (`ConfirmDialog`) | `onConfirm` is sync and the dialog closes at once: no pending state, no error display. No field for a reason (Void needs `reason`, max 300). |
| `organisms/Overlays.tsx` (`Drawer`) | Uses `animate-in` / `animate-out` classes from a Tailwind plugin that isn't installed, so they do nothing. |
| `organisms/DataTable.tsx` (`Pagination`) | Shows at most 8 page buttons, no previous/next. Paging is up to the caller (the API has no pagination). |
| `organisms/DataTable.tsx` | Empty and error states render only if the `empty` / `error` props are passed. |
| `atoms/Input.tsx` (`Select`) | Native single select only. No multi-select (Add Property managers) and no searchable picker (Add Lease tenant). |
| (missing) | No date or month picker component (lease dates, Rent Roll month). |
| `molecules/FormField.tsx` | Passes an `invalid` prop to its child, so the child must be a design system control, not a plain HTML element. |

---

## Changes we made

| Date | File | What changed | Why |
| --- | --- | --- | --- |
| | | | |
