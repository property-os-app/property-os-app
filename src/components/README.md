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
| `Input`, `Textarea` | Text fields; 16px text under md (no iPhone zoom), 14px from md | `invalid`, `mobile` (Input) | Form fields, inside `FormField`. |
| `Select` | Native select with chevron | `invalid`, `<option>` children | Single choice from a short list. |
| `CurrencyInput` | "$" prefix, right-aligned, formats on blur; digits and one dot, max 2 decimals, never `NaN` | `value: number \| ""`, `onChange(number \| "")` | Money inputs (rent, deposit, payment). Use with react-hook-form `Controller`. |
| `Checkbox` | Styled checkbox with label | `label`, native checkbox props | Yes/no inside a form. |
| `Toggle` | 40×22 switch | `checked`, `onChange(boolean)`, needs `aria-label` | On/off settings (auto-renew). |
| `Kbd` | Keyboard hint (⌘K) | - | Shortcut hints. |
| `Avatar` | Initials or image circle | `name`, `src`, `size` 24/32/40/56, `online` | People in lists and the sidebar. |
| `Skeleton` | Shimmer block | `className` for size | Loading placeholders (no spinners). |
| `Divider` | 1px line | - | Separating sections. |
| `CollectionProgress` | 16px striped bar + % | `value` 0-100 or `null` (empty bar, no %), `label` | Rent collection rate. |
| `Bar` | Thin 8px bar | `value`, `tone` | Occupancy and similar ratios. |
| `Ring` | Circular 0-100 score | `value`, `size` | Portfolio health score. |

## Molecules

Atoms combined to do one job.

| Component | What it does | Main props | When to use |
| --- | --- | --- | --- |
| `StatusBadge` | Maps a domain status to a tone and a friendly label | `domain` rent/lease/esign/ticket/priority/unit/insurance/approval, `status` (API enum for rent/lease/esign/unit, e.g. `UNDER_MAINTENANCE`; lease also takes UI-only `EXPIRING`), `children` (label override). `statusLabel` holds the labels. | Every status in a table or drawer. |
| `FormField` | Label, control, help or error text | `label`, `htmlFor`, `required`, `help`, `error`, `action` | Wrap every form control. |
| `SearchInput` | Input with a search icon | Input props, `shortcut` | Toolbar search. |
| `SegmentedControl` | Button group with counts; scrolls sideways inside itself when too wide | `value`, `onChange`, `segments`, `aria-label` | Status filter (Rent Roll). |
| `Tabs` | Underline tabs with counts | `value`, `onChange`, `tabs` | Drawer tabs, Tenants page tabs. |
| `FilterChip` | Pill filter, removable when active | `active`, `count`, `onRemove` | Applied filters in a toolbar. |
| `Card` | White bordered surface | `padding` none/compact/default, `as` | Grouping content. |
| `ListCard` + `ListCardSkeleton` | One list row as a card (phones): title, subtitle, `leading` (Avatar), `badge` row, 2-3 `facts`, right `amount` (label, value, caption), `note`, red `strip`, `muted`, kebab `actions`. The tap area is one link (`href` + `renderLink`) or button (`onOpen`) stretched over the card, named by `openLabel`; the kebab never opens the card | `title`, `subtitle`, `facts`, `amount`, `strip`, `actions`, `href`/`onOpen`, `openLabel`, `renderLink`, `flat` (divided rows inside a card or drawer) | Every list under md, through `CardList`. `strip` means one thing only in this app: behind on rent. |
| `CardHeader` | Card title row | `title`, `description`, `action` | Top of a card. |
| `KpiCard` | Label, big value, delta chip on its own line, then the note (each block on its own line). In a `KpiRow` it is a 4-row subgrid, so labels, values, chips and notes line up across a row | `label`, `value`, `tone`, `delta`, `note`, `onClick`/`href`, `renderLink` (router link for `href`) | KPI row cards. |
| `HeroStatCard` | Big stat with colored top border; the value is 24 / 32 / 48px by the card's own width (container query) so "$42,500.00" always fits | `label`, `value`, `note`, `tone` | Total due / collected / outstanding. |
| `KeyValueList` | Two-column label/value grid | `items`, `labelWidth` | Details in drawers. |
| `InternalNote` | Amber "not visible to tenant" note | `author`, `date` | Staff-only notes. |
| `EmptyState` | Icon, title, sentence, action | `icon`, `title`, `description`, `action` | Empty lists (used by DataTable). |
| `InlineError` | Error box with Retry | `title`, `description`, `onRetry` | Failed loads (used by DataTable). |
| `Banner` | Amber strip under the top bar | `children`, `action` | Unsaved / offline notice. |
| `Toaster` + `toast` | Sonner toasts, styled | `toast.success/error/info(message, opts)` | Mount `Toaster` once; toast after saves. Errors stay until dismissed. |
| `Stepper` | Horizontal numbered steps | `steps`, `current` | Multi-step modals. |
| `StatusTracker` | Vertical steps | `steps`, `current` | Renter ticket progress. |
| `FileDropzone` | Drag-and-drop upload list | `files`, `onFiles`, `onRemove` | File uploads. |
| `ThemeSwitch` | Light/dark switch that looks like a Topbar ghost icon button (40×40, 44×44 tap area). One icon in `currentColor` morphs sun ↔ crescent moon (rays shrink and fade, circle becomes a crescent, small turn, 300 ms ease-out). Reduced motion: instant | `checked` (true = dark), `onChange(checked, event)`. Has `role="switch"`, name "Dark mode" and a "Switch to dark/light mode" tooltip | Topbar `endSlot`. Holds no theme logic; the app saves the choice. |
| `KebabMenu` | "⋮" row actions menu (44px button and items under md) | `items` (label, icon, onSelect, destructive, disabled), `trigger` (custom opener, e.g. an Avatar) | Row actions in tables; Topbar profile menu. |
| `AiActionItem`, `AiHeading` | AI finding row / AI card header | `finding`, `reason`, `onAction` | AI surfaces. |
| `TimelineItem`, `TimelineDay` | Activity row / day header | `icon`, `tone`, `meta` | Activity feeds. |
| `ChatBubble` | Message bubble | `mine`, `meta` | Chat. |

## Organisms

Page sections. They own no data.

| Component | What it does | Main props | When to use |
| --- | --- | --- | --- |
| `Sidebar` | Left nav, filtered by role | `role`, `active` (optional: nothing highlighted), `user`, `scope`, `onScopeClick`, `groups`, `brand`, `renderLink`, `badges`, `collapsed`, `onNavigate` (after a nav click), `onClose` ("Close menu" button) | Inside `WorkspaceShell` and its mobile menu. |
| `Topbar` | 64px top bar: title, scope chip, avatar; search, bell and quick add only when their handler is passed | `title`, `scope`, `user`, `showAi`, `onSearch`, `onNotifications`, `onQuickAdd`, `profileMenu` (or `onProfile`), `onMenu` ("Open menu" button below lg), `endSlot` (content just left of the avatar) | Inside `WorkspaceShell`. |
| `PageHeader` | Page title, description, actions (wrap under the title on narrow screens) | `title`, `description`, `actions`, `breadcrumb` | Top of every page. Primary action last. |
| `Toolbar` | Wrapping row | `children` | Search + filters above a table. |
| `KpiRow` | Grid of up to 4 cards (2 columns under lg); `KpiCard`s inside line up row by row | `children` | Row of `KpiCard`s. |
| `DataTable` | Table with 5 states, sort, selection, totals | `columns`, `rows`, `rowKey`, `state`, `empty`, `error`, `onRowClick`, `rowClickable` (false = that row gets no pointer and no click), `rowStrip` (red left bar on the first cell, behind on rent only, always with an "Overdue" label), `sort`/`onSortChange`, `totals`, `footer` | Every list. |
| `CardList` | The phone version of `DataTable`: the same rows as `ListCard`s, with loading skeletons, empty, error, an optional `summary` card on top and the pagination `footer` | `rows`, `rowKey`, `renderCard`, `state`, `empty`, `error`, `summary`, `footer`, `caption`, `flat`, `grid` (1 / 2 md / 3 xl columns, 6 skeletons) | Every list under md (switch with `useIsMobile`); with `grid`, the desktop Cards view of a main list. |
| `Pagination` | Page number buttons; under md Previous / "Page x of y" / Next (44px) | `page`, `pageCount`, `onPageChange`, `summary` | In `DataTable` `footer` and `CardList` `footer`. |
| `Drawer` | Right side panel (480/640/800) | `open`, `onOpenChange`, `title`, `status`, `tabs`, `footer`, `size`, `confirmClose`, `side` ("left": navigation menu, "bottom": phone sheet up to 85% high), `bare` (no header/padding) | One record from a list. Never stack. `side="bottom"`: the phone filter sheet. |
| `Modal` | Centered dialog (480/640); full screen under md; footer buttons wrap | `open`, `onOpenChange`, `title`, `footer`, `size`, `confirmClose`, `mobile` ("fullscreen" default, "sheet") | Create/edit forms; may open over a drawer. |
| `ConfirmDialog` | Confirm modal, optional type-to-confirm (bottom sheet under md) | `title`, `consequence`, `confirmLabel`, `onConfirm`, `destructive`, `typeToConfirm`, `busy`, `error` (with either, the dialog stays open and the caller closes it on success) | Every destructive action. |
| `RentCollectionHero` | 3 hero stats + collection bar | `period`, `totalDue`, `collected`, `outstanding`, counts | Dashboard rent block. |
| `BarChart` | Vertical bars, grouped series, one y-axis, grid lines, legend for 2+ series, tooltips (hover + keyboard), hidden table, 5 states | `series` (label, color), `data` (key, label, fullLabel, values), `formatValue`, `formatTick`, `tooltip`, `integer`, `onBarClick`, `caption`, `height`, `state`/`empty`/`error` | Dashboard charts. Fluid width; values as integers (cents, counts). |
| `StackedBar` | One horizontal bar split into parts, legend with count and %, tooltips, hidden table | `segments` (key, label, value, color), `onSegmentClick`, `caption`, `state`/`empty`/`error` | Units by status. |
| `IncomeExpenseChart`, `DonutChart`, `HBarList` | Simple SVG/CSS charts | `data` / `slices` / `items`, `format` | Finance charts. |
| `KanbanBoard` | 4-column ticket board | `tickets`, `onOpen`, `onMove` | Maintenance tickets. |
| `AiActionPanel`, `AiCommandCenter` | AI panels | `actions` / `score`, `headline` | AI features. |
| `ActivityTimeline` | Grouped activity feed | `events`, `limit` | Activity page / widget. |
| `RenterTabBar`, `OwnerNav` | Renter and owner portal nav | `active` | Other portals. |

## Templates

Page layouts.

| Component | What it does | Main props | When to use |
| --- | --- | --- | --- |
| `WorkspaceShell` | Sidebar + Topbar + centered main (max 1440); the window scrolls. Below lg the sidebar hides and the Topbar menu button opens it in a left drawer | `sidebar` (SidebarProps), `topbar` (TopbarProps), `banner`, `menuOpen` + `onMenuOpenChange` (optional, controlled) | Rendered ONCE by our layout route. Pages never wrap themselves. |
| `NavMenuDrawer` | The Sidebar in a left `Drawer` (closes on a pick, X, Escape, outside tap; focus returns to the opener) | `open`, `onOpenChange`, `sidebar` | Used by `WorkspaceShell`; reuse it for any other opener (phone tab bar "More"). |
| `AuthLayout` | Form column (max 400px) + optional brand panel | `children`, `aside` | Login page. |
| `OwnerShell` | Top-nav owner portal | `nav` | Not this app. |
| `RenterShell` | Mobile tenant portal | `active`, `header` | Not this app. |
| `SettingsLayout` | Settings sub-nav + content | `sections`, `active`, `renderLink` | Settings pages. |
| `ThreePaneLayout` | List / thread / context | `list`, `thread`, `context` | Inbox / chat. |

---

## Styles and tokens

**`src/styles/theme.css`** is the source of truth. It imports Tailwind, defines light (default) and `.dark` colors, and maps them to utilities.

| Kind | Classes |
| --- | --- |
| Background / surfaces | `bg-bg`, `bg-surface-1` (cards), `bg-surface-2` (inputs, headers), `bg-surface-3` (hover), `bg-overlay`, `bg-scrim` |
| Borders | `border-border-subtle`, `border-border-strong` |
| Text | `text-text-primary`, `text-text-secondary`, `text-text-muted` |
| Status | `success` (green #059669, the main color), `danger`, `warning`, `info`, `ai`, each with `-soft`; `text-success-fg` is the dark text on solid green; `bg-danger-solid` is the red under white text (danger Button, danger Count) |
| Type scale | `text-hero` 48, `text-display` 32, `text-h1` 24, `text-h2` 20, `text-h3` 16, `text-body` 14, `text-body-lg` 16, `text-small` 13, `text-caption` 12, `text-overline` 11 |
| Radius | `rounded-badge` 6, `rounded-control` 8, `rounded-card` 12, `rounded-overlay` 16, `rounded-pill` |
| Sizes | `w-sidebar` 264, `h-topbar` 64, `w-drawer` 480 / `-lg` 640 / `-xl` 800, `w-modal` 480 / `-lg` 640, `max-w-content` 1440 |
| Extras | `tabular` (number figures), `focus-ring`, `focus-ring-tight` (inline links), `shadow-overlay`, `duration-fast/overlay/draw`, `animate-shimmer`, `hazard-fill` |

**`src/tokens/index.ts`**: the same values as JS (`colors`, `typography`, `spacing`, `radius`, `layout`, `motion`, `chartPalette()`), for places CSS can't reach. Keep in sync with theme.css.

**`src/lib/cn.ts`**: `cn(...classes)` merges class lists (clsx + tailwind-merge, taught our custom classes). Use it for every `className`.

**`src/lib/format.ts`**: `formatCurrency`, `formatCompactCurrency`, `formatPercent`, `formatDate`, `formatRelative`, `leaseCountdown`, `initials`, `EMPTY`, plus our `toCents`, `centsToAmount`, `todayISO`, `todayUTC`, `daysUntil`, `currentMonth`, `currentMonthUTC`, `isMonth`, `formatMonth`, `addMonthsYM`, `dayInMonth`, `addMonthsISO`, `addDaysISO`, `formatShortDate`, `ordinal`. Takes API money strings and "YYYY-MM-DD" dates; details in [src/lib/README.md](../lib/README.md).

---

## Used in this project vs not used

Based on docs/BRIEF.md (admin portal: login, Properties, Units, Tenants, Leases, Rent Roll; Dashboard is a bonus).

**Used**
- Atoms: Button, LinkButton, Badge, Tag, Count, Delta, Typography (H1-H3, Body, Small, Caption, Overline, Display, Num, Dash), Input, Textarea, Select, CurrencyInput, Checkbox, Toggle, Avatar, Skeleton, Divider, CollectionProgress, Bar
- Molecules: StatusBadge, FormField, SearchInput, SegmentedControl, Tabs, FilterChip, Card, CardHeader, KpiCard, HeroStatCard, KeyValueList, EmptyState, InlineError, Toaster + toast, KebabMenu, Stepper (Add Lease wizard), ThemeSwitch (Topbar)
- Organisms: Sidebar, Topbar, PageHeader, Toolbar, KpiRow, DataTable, Pagination, Drawer, Modal, ConfirmDialog, BarChart, StackedBar
- Templates: WorkspaceShell, AuthLayout, SettingsLayout
- Dashboard: HeroStatCard, CollectionProgress, BarChart, StackedBar (RentCollectionHero is not used: see Known gaps)

**Not used** (out of scope in the brief)
- AI: AiActionItem, AiHeading, AiActionPanel, AiCommandCenter, Ring, Button `variant="ai"`
- Charts: IncomeExpenseChart, DonutChart, HBarList
- Maintenance / chat / activity: KanbanBoard, StatusTracker, ChatBubble, TimelineItem, TimelineDay, ActivityTimeline, ThreePaneLayout
- Other portals: RenterTabBar, OwnerNav, RenterShell, OwnerShell
- Other: FileDropzone (no uploads), InternalNote, Banner, Kbd

---

## Known gaps for our backend

Facts seen in the code. Fixed gaps are removed from this list and logged in "Changes we made".

| File | Gap |
| --- | --- |
| `atoms/Input.tsx` (`CurrencyInput`) | No negative values. Not a forwardRef, so react-hook-form can't focus it on error. |
| `organisms/Panels.tsx` (`RentCollectionHero`) | Takes numbers and computes the rate with float math; needs `unitsBilled`, `paymentsReceived`, `lateCount`, which our rent-roll summary doesn't have (it has `collectionRate`, `overdueCount`). |
| `organisms/Sidebar.tsx` | `Role` is admin/manager/leasing/maintenance/accountant (we map OWNER → admin, PROPERTY_MANAGER → manager). Default groups list out-of-scope modules; we must pass our own `groups`. Avatar always shows the online dot. |
| `organisms/Topbar.tsx` | `showAi` defaults to `true` (we pass `false`). Search placeholder mentions tickets (we don't pass `onSearch`, so it's hidden). |
| `organisms/Overlays.tsx` (`ConfirmDialog`) | No field for a reason (Void needs `reason`, max 300). We use our own `VoidEntryModal` (on `Modal`) instead. |
| `organisms/Overlays.tsx` (`Drawer`) | Uses `animate-in` / `animate-out` classes from a Tailwind plugin that isn't installed, so they do nothing. |
| `organisms/DataTable.tsx` (`Pagination`) | Shows at most 8 page buttons, no previous/next. Paging is up to the caller (the API has no pagination). |
| `organisms/DataTable.tsx` | Empty and error states render only if the `empty` / `error` props are passed. |
| `atoms/Input.tsx` (`Select`) | Native single select only. No multi-select (Add Property managers) and no searchable picker (Add Lease tenant). |
| (missing) | No date or month picker component (lease dates, Rent Roll month). Rent Roll uses prev / month / next buttons; dates use `Input type="date"`. |
| `atoms/Button.tsx` (`LinkButton`), `organisms/Panels.tsx` (RentCollectionHero, AiCommandCenter, ActivityTimeline links) | Plain `<a href>`, which reloads the whole app. Unused by us; use a router `Link` with `buttonVariants` instead. |
| `molecules/FormField.tsx` | Passes an `invalid` prop to its child, so the child must be a design system control, not a plain HTML element. |

---

## Changes we made

| Date | File | What changed | Why |
| --- | --- | --- | --- |
| 2026-10-12 | `eslint.config.js` (override for `src/components/**`) | Turned off `react-refresh/only-export-components`, `react-hooks/immutability`, `react-hooks/set-state-in-effect` for design system files only. No component file edited. | Newer lint rules (react-hooks 7, react-refresh 0.5) flagged 19 errors in code written before them; editing 8 component files was riskier than a scoped override. |
| 2026-10-12 | `lib/format.ts` | Money functions accept API strings (and null/undefined/"" -> "-"); added `toCents`, `centsToAmount`, `MoneyInput`. `formatDate` and `leaseCountdown` parse "YYYY-MM-DD" by parts and count calendar days. Added `todayISO`, `currentMonth`; comment on `formatRelative`. Export names unchanged. | API sends money as strings; `new Date("YYYY-MM-DD")` showed the previous day in US time zones; money math must use integer cents. |
| 2026-10-13 | `organisms/Topbar.tsx` | Search box renders only when `onSearch` is passed, bell only with `onNotifications`, quick add only with `onQuickAdd`. New optional `profileMenu` (MenuItem[]): the avatar opens a KebabMenu with those items; without it the old `onProfile` button stays. | Our Topbar has no search, bell or quick add; users need the email and Sign out from the avatar. |
| 2026-10-13 | `molecules/Menu.tsx` (`KebabMenu`) | Optional `trigger` prop: custom content for the opening button instead of the "⋮" icon. | Reuse the same menu panel for the Topbar profile menu instead of a second menu. |
| 2026-10-13 | `organisms/Sidebar.tsx` | Optional `brand` prop, default "PropOS". | We show "PropertyOS". |
| 2026-10-13 | `molecules/StatusBadge.tsx` | rent, lease, esign and unit domains now use the backend enums as keys (PAID, NOT_BILLED, DRAFT, ENDED, TERMINATED, NOT_SENT, RESERVED, UNDER_MAINTENANCE...) plus the UI-only lease `EXPIRING`. New `statusLabel` map shows friendly labels ("Not billed", "Under maintenance"). Other domains unchanged. | Feature code passes API values straight in; the UI never shows a raw enum. |
| 2026-10-13 | `atoms/Input.tsx` (`CurrencyInput`) | Keeps only digits and one dot, max 2 decimals; "" and "." report `""`, so `onChange` never gets `NaN`. | "1.2.3" gave `NaN`; the API rejects more than 2 decimals. |
| 2026-10-13 | `organisms/Overlays.tsx` (`ConfirmDialog`) | Optional `busy` (buttons disabled, "Working...", can't close) and `error` (InlineError in the dialog). With either prop the dialog stays open after Confirm and the caller closes it on success. The typed name resets whenever it closes. Without them it works as before. | Delete property and Remove manager must show the backend 409/400 message in the dialog. |
| 2026-10-13 | `lib/format.ts` | Added `todayUTC()` (UTC "YYYY-MM-DD") and `daysUntil(date)` (calendar days from local today). Nothing else changed. | The unit drawer compares `oldestUnpaidDueDate` with the backend's UTC today, and shows "{n} days left" without `new Date("YYYY-MM-DD")`. |
| 2026-10-13 | `templates/Shells.tsx` (`SettingsLayout`) | Optional `renderLink` prop, same signature as `Sidebar`'s; default is still a plain `<a>`. New exported `SettingsLayoutProps`. | Plain `<a>` reloaded the whole app on section clicks; we pass React Router's `Link`. |
| 2026-10-13 | `styles/theme.css` | `color-scheme: light` on `:root`, `color-scheme: dark` on `.dark` / `[data-theme="dark"]`. | Native controls (Select lists, date pickers, scrollbars, autofill) stayed light in dark mode. |
| 2026-10-13 | `styles/theme.css` | `@custom-variant dark` matching `.dark` and `[data-theme="dark"]`. | Tailwind `dark:` classes (Skeleton shimmer) followed the OS setting instead of our chosen theme. |
| 2026-10-13 | `styles/theme.css`, `tokens/index.ts`, `lib/cn.ts`, `atoms/Button.tsx`, `atoms/Badge.tsx` (`Count`) | New `--danger-solid` token / `bg-danger-solid` utility (`dangerSolid` in tokens, known to `cn`): `#e11d48` in both themes. Danger Button and danger Count use it instead of `bg-danger`. Light looks the same (`#e11d48` was already the light danger). | White text on dark `#f43f5e` was 3.67:1; on `#e11d48` it is 4.70:1 (WCAG AA 4.5:1). `--danger` (text, dots, soft fills) is unchanged. |
| 2026-10-13 | `lib/format.ts` | Added `addMonthsISO(date, n)` (year/month/day math, day clamped to the month's last day), `addDaysISO(date, n)` and `ordinal(n)` ("1st", "31st"). Nothing else changed. | The lease wizard sets the end date from a term (start + N months - 1 day) without `new Date("YYYY-MM-DD")`; the drawer shows "due on the 1st". |
| 2026-10-13 | `lib/format.ts` | Added `isMonth`, `currentMonthUTC`, `formatMonth` ("October 2026"), `addMonthsYM` (month math on numbers) and `dayInMonth(month, day)` (clamped to the month's last day). Nothing else changed. | Rent Roll needs the backend's UTC month, month labels, prev / next month and the Rent due date without `new Date("YYYY-MM-DD")`. |
| 2026-10-13 | `molecules/StatusBadge.tsx` | Comment only: API docs path now `../property-os-api/docs/frontend-handoff/API.md`. | The local docs/API.md copy was removed; the backend repo is the only source. |
| 2026-10-13 | `lib/format.ts` | Comment only on `MoneyInput`: the API always sends 2 decimals ("1200.00"); other decimal counts still parse. | Backend Batch A: every money field is now a 2-decimal string. |
| 2026-10-13 | `lib/format.ts` | New exported `parseDateOnly(value)` (strict "YYYY-MM-DD" with a real calendar day, never throws) and `Ymd` type; `formatDate` and the other date helpers parse strings only through it (no more first-10-characters of any string). New `formatTimestampDate(ts)` (local day of an ISO timestamp). `todayUTC` built from UTC parts instead of `toISOString`. | Backend Batch B: date-only fields are strictly "YYYY-MM-DD". Timestamps (createdAt) showed the UTC day, so in the US an evening entry showed tomorrow's date. |
| 2026-10-14 | `molecules/Feedback.tsx` (`Toaster`) | Optional `position` prop (Sonner positions), default still `"bottom-right"`. We mount it with `"top-center"` in `src/app/providers.tsx`. | Bottom-right toasts covered the drawer and modal footer buttons; the position was hard-coded. |
| 2026-10-14 | `molecules/Feedback.tsx` (`toast`) | `toast.success` takes an optional `duration` (ms); without it the Toaster default of 4 s stays. | The "voided" toast keeps its Undo button for 10 s; the duration was fixed. |
| 2026-10-14 | `organisms/Charts.tsx` | New `BarChart` (grouped bars, one y-axis, light grid lines, thin bars with rounded tops and 2px gaps, legend only for 2+ series, tooltip on hover and keyboard focus, optional click, hidden table, loading / empty / error) and `StackedBar` (one split bar, legend with count and %, tooltips, hidden table, states). CSS percentages, theme colors only. Existing charts unchanged. | The dashboard needs charts with tooltips, keyboard access and states; the existing ones have none, and no chart library is allowed. |
| 2026-10-14 | `molecules/Cards.tsx` (`KpiCard`) | Optional `renderLink(href, props)` for `href` (like Sidebar's); default still a plain `<a>`. | A plain `<a>` reloaded the whole app; the dashboard KPI cards are router links. |
| 2026-10-14 | `atoms/Progress.tsx` (`CollectionProgress`) | `value` may be `null`: empty bar, no percentage, `aria-valuetext` "No data". | `collectionRate` is null when nothing is billed; 0% would be wrong. |
| 2026-10-14 | `organisms/Sidebar.tsx` | `active` is optional; without it nothing is highlighted. | Dashboard is now in our nav; the not-found page must not highlight it. |
| 2026-10-14 | `templates/Shells.tsx` (`WorkspaceShell`) | Sidebar shows from `lg` (was `md`). Below lg the Topbar gets a menu button that opens the same Sidebar in a left drawer. New optional `menuOpen` / `onMenuOpenChange` (controlled) and new exported `NavMenuDrawer` (+ `NavMenuDrawerProps`). | There was no navigation at all under 768px, and the 264px sidebar crowded tablets. The drawer is a separate export so a later phone tab bar can open the same menu. |
| 2026-10-14 | `organisms/Overlays.tsx` (`Drawer`) | Optional `side` ("right" default, "left": sidebar width, max 85vw) and `bare` (children fill the panel, title and description only for screen readers). Right drawers unchanged. | The mobile menu needs a left panel that holds the Sidebar as it is, with Radix focus trap, Escape and focus return. |
| 2026-10-14 | `organisms/Overlays.tsx` (`Modal`) | Footer row wraps (`flex-wrap`). | Three footer buttons (Lease wizard) overflowed the screen at 390px. |
| 2026-10-14 | `organisms/Sidebar.tsx` | Optional `onNavigate` (called after a nav item click) and `onClose` ("Close menu" X next to the brand). Without them nothing changes. | The mobile menu closes when an item is picked and needs a visible close button. |
| 2026-10-14 | `organisms/Topbar.tsx` (`Topbar`) | Optional `onMenu`: "Open menu" icon button, hidden from lg. Padding `px-4 lg:px-8` (was `px-8`); the title truncates instead of `whitespace-nowrap`. | Mobile menu opener; 32px side padding and a long unbreakable title wasted or overflowed a phone screen. |
| 2026-10-14 | `organisms/Topbar.tsx` (`PageHeader`) | Title row and actions wrap (`flex-wrap`); the title block has `min-w-0`. | The Rent Roll header (month switcher, Generate rent, Record Payment) overflowed at 390px. |
| 2026-10-14 | `molecules/SegmentedControl.tsx` | `max-w-full overflow-x-auto` on the group, segments don't shrink or wrap their text. | 5-6 status segments with counts (Units, Leases, Rent Roll) made the page scroll sideways at 390px; now only the control scrolls. |
| 2026-10-15 | `styles/theme.css` | New `focus-ring-tight` utility: same 2px ring as `focus-ring`, offset 0. `focus-ring` unchanged. | On inline text links the 2px offset pushed the ring onto the next word or separator. |
| 2026-10-15 | `templates/Shells.tsx` (`SettingsLayout`) | Section links get `focus-visible:focus-ring`. | They had no visible keyboard focus at all. |
| 2026-10-15 | `organisms/Overlays.tsx` (`Modal`, `Drawer`) | Without a `description`, Content gets `aria-describedby={undefined}` (was only for a bare Drawer). With a description nothing changes. | Radix logged "Missing Description or aria-describedby" for every modal and drawer without one. |
| 2026-10-15 | `templates/Shells.tsx` (`WorkspaceShell`) | Content column gets `overflow-x-clip`; `main` gets `min-w-0`. | The Rent Roll made the whole page scroll sideways on desktop. `clip` (not `hidden`) keeps the sticky Topbar working; wide tables still scroll inside their own card. |
| 2026-10-15 | `lib/format.ts` | Added `formatShortDate` ("Oct 14", date-only, no year). Nothing else changed. | Rent Roll captions ("Starts Oct 14 · first rent Nov 1") and the prorated rent description. |
| 2026-10-15 | `molecules/ThemeSwitch.tsx` (new), `molecules/index.ts` | New `ThemeSwitch`: a ghost icon button (same `buttonVariants` ghost / icon-only as the other Topbar buttons, so same size, shape, hover and keyboard-only focus ring) with one SVG icon in `currentColor` that morphs sun ↔ crescent moon (rays scale to 0 and fade, a mask circle slides over the disc, 45° turn, 300 ms ease-out). `role="switch"`, `aria-checked`, name "Dark mode", tooltip; 44×44 tap area via `after:`; `motion-reduce`: no transitions. No new tokens. | A clean light/dark switch in the Topbar; `Toggle` is a form switch, not a Topbar icon button. A first pill version (tracks, knob, stars, own tokens) was replaced the same day as too busy. |
| 2026-10-15 | `organisms/Topbar.tsx` (`Topbar`) | Optional `endSlot` (ReactNode), rendered just left of the avatar. Without it nothing changes. | Place the ThemeSwitch next to the avatar without the Topbar knowing about themes. |
| 2026-10-20 | `molecules/ListCard.tsx` (new), `molecules/index.ts` | New `ListCard` (title, subtitle, leading, badge row, 2-3 facts, right amount, note, red left `strip`, `muted`, kebab slot, `flat` variant) and `ListCardSkeleton`. One link (`href` + `renderLink`) or button (`onOpen`) stretched over the card with `openLabel` and a focus ring; the content ignores the pointer except the kebab; no z-index so an open kebab menu stays above the next card. Theme tokens only. | Phones show every list as cards instead of a table that scrolls sideways. |
| 2026-10-20 | `organisms/CardList.tsx` (new), `organisms/index.ts` | New `CardList`: the same rows / states / empty / error / footer props as `DataTable`, rendered as a `<ul>` of cards, skeleton cards while loading, optional `summary` card, wrapping footer. `DataTable` itself is unchanged. | One phone list with the five states for every table, without touching the desktop table. |
| 2026-10-20 | `organisms/Overlays.tsx` (`Drawer`) | New `side="bottom"`: full width, max 85dvh, rounded top, slides up, 44px close button, footer padded above the iPhone home bar. Right and left drawers unchanged (only their classes were split per side). | The phone "Filters" button opens its controls in a bottom sheet. |
| 2026-10-20 | `organisms/Overlays.tsx` (`Modal`, `ConfirmDialog`) | Under md a Modal is full screen (`h-dvh`, body fills, footer at the bottom above the home bar, 44px close). New `mobile` prop: "fullscreen" (default) or "sheet" (the old bottom sheet). `ConfirmDialog` uses "sheet"; its type-to-confirm field has 16px text under md. Title block gets `min-w-0`. From md up nothing changes. | Forms in a 90%-high sheet felt cramped on phones; a two-line confirm stays a small sheet. |
| 2026-10-20 | `atoms/Input.tsx` (`Input`, `Textarea`, `Select`, `CurrencyInput`) | Text is `text-body-lg` (16px) under md, `text-body` (14px) from md. | iPhone Safari zooms the page into any field with text under 16px. |
| 2026-10-20 | `molecules/Menu.tsx` (`KebabMenu`) | Under md the "⋮" button is 44×44 and menu items are at least 44px tall. From md up unchanged. | 32px tap targets were too small on phones. |
| 2026-10-20 | `organisms/DataTable.tsx` (`Pagination`) | Under md: Previous, "Page x of y", Next (44×44); the number buttons show only from md, unchanged. | 8 number buttons and the summary didn't fit at 375px, and 32px buttons were too small to tap. |
| 2026-10-22 | `molecules/FormField.tsx` | The `action` next to the label sits in a `-my-2` wrapper, so a 32px button there no longer makes the label row taller than a plain label. | In Add Lease → Deposit the "Same as rent" button pushed the "$" deposit box ~14px below the E-signature select beside it. |
| 2026-10-22 | `atoms/Input.tsx` (`CurrencyInput`) | The symbol is `shrink-0`; the number field is `min-w-0 flex-1`. No visual change at normal widths. | A long amount in a narrow box could squeeze the "$" and shift the gap before the number. |
| 2026-10-24 | `organisms/CardList.tsx` | Optional `grid`: cards and loading skeletons in a 1-column grid, 2 from md, 3 from xl (6 skeletons by default, 4 otherwise); each card fills its cell so cards in a row are the same height. Without it nothing changes; ignored with `flat`. | Leases, Units and Rent Roll get a desktop Cards view that reuses the phone cards with the same five states and footer. |
| 2026-10-24 | `molecules/Cards.tsx` (`KpiCard`) | Stacked at every width: label, value, delta chip on its own line, then the note as a block (a `block` span inside starts a new line). The card is `row-span-4 grid-rows-subgrid` with no row gap (spacing is `mt-2` on the value, chip and note, so an empty line takes no space): inside `KpiRow` the four lines start at the same height across cards of a row. Padding 16px under md, 20px from md. Props unchanged. | On phones (and at 1024, ~120px per card) the chip sat next to the note, which wrapped onto 3 lines; cards side by side looked uneven. |
| 2026-10-24 | `molecules/Cards.tsx` (`HeroStatCard`) | The card is a container (`@container`, `min-w-0`); the value is 24px (h1 size, weight 800), 32px from a 14rem content width, 48px from 18rem. | In the dashboard's 3 columns at 768-1279px the card has ~160-240px for the value; "$42,500.00" at 48px (~260px) ran out of the card. |
| 2026-10-24 | `organisms/DataTable.tsx` | Optional `rowStrip(row)`: when true, a 4px `bg-danger` bar on the left edge of the row's first cell (the checkbox cell when selectable), like `ListCard`'s `strip`. Without it, or when false, rows render exactly as before. | Leases, Rent Roll and Tenants show the "behind on rent" strip on desktop table rows too, not only on phone cards. |
| 2026-10-24 | `organisms/DataTable.tsx` | Optional `rowClickable(row)`: with `onRowClick`, rows where it returns false get no `cursor-pointer` and no click (hover stays). Without it every row is clickable, as before. | The Owner row in Settings → Users and Permissions showed a pointer but clicking did nothing. |
| 2026-10-24 | `lib/format.ts` | Added `daysSince(date)` (local calendar days since a past date, at least 1, built on `daysUntil`). Nothing else changed. | One day count for "{n} days overdue" on screen and in the reminder email (was inline `Math.max(1, -daysUntil(...))` in two places). |
| 2026-10-24 | `lib/format.ts` (`formatCompactCurrency`) | Rounds in integer cents first, then picks $, K or M: $999.50 is "$1.0K" (was "$1000"), $999,950 is "$1.0M" (was "$1000.0K"); a value that rounds to $0 has no minus ("-0.40" is "$0", was "-$0"). Other values unchanged. | Found by the new unit tests (`src/lib/format.test.ts`). |
