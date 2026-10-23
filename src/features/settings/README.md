# src/features/settings

Settings: the General tab (theme, saved on this device, no API) and, for the owner only, Users and Permissions (which properties each manager sees and what they may change).

## theme.ts
- `ThemePreference`: `"light" | "dark" | "system"`.
- `THEME_KEY`: localStorage key `"propertyos.theme"`. The inline script in `index.html` reads the same key before the app loads, so there is no light flash.
- `readThemePreference()`: saved preference, `"light"` when missing, invalid or storage is blocked.
- `saveThemePreference(preference)`: saves it; ignores blocked storage.
- `darkMediaQuery()`: the `prefers-color-scheme: dark` media query, or null.
- `applyTheme(dark)`: adds or removes the `dark` class on `<html>`; every design system component follows it.

## themeContext.ts
- `useTheme()`: `{ preference, resolved, setPreference }`. Only inside `ThemeProvider`.
- `ThemeContext`, `ThemeContextValue`: the context and its type.

## ThemeProvider.tsx
- `ThemeProvider`: holds the preference, applies the `dark` class, and on "system" follows the computer's setting live. Mounted at the app root (`src/app/providers.tsx`), so the login page uses it too. Sign-out does not clear it.

## themeReveal.ts
- `changeThemeWithReveal(origin, dark, setPreference)`: saves "light" or "dark" (same key as Settings) and shows the new theme in a circle growing from `origin` over 400 ms (View Transitions API). No support or reduced motion: instant. Used by the Topbar ThemeSwitch; Settings stays instant. The CSS that turns off the default cross-fade is in `src/index.css`.

## SettingsFrame.tsx
- `SettingsFrame({ active, children })`: PageHeader "Settings" + `SettingsLayout` left nav: General, plus "Users and Permissions" with `access.manage` (owner).
- `SettingsTab`: `"general" | "users"`.

## SettingsPage.tsx
- `SettingsPage`: `/settings`, the General tab. An "Appearance" card with a Theme `SegmentedControl` (Dark / Light / System). Applies right away, no Save button, no toast.

## UsersPage.tsx
- `UsersPage`: `/settings/users`. Without `access.manage` it redirects to `/settings`. H2 + one line, search (name or email) and a "{n} members" badge, then `MembersTable` with the owner (from GET /auth/me, "All properties", no kebab) and every manager (GET /managers; scope names from GET /properties). Loading / error / no-match states; a "No managers yet" card when there are none. Opens `EditAccessDrawer`.

## MembersTable.tsx
- `MemberRow`: one row (id, name, email, role, scope text, `manager` on manager rows).
- `MembersTable`: DataTable from md up (Member, Role, Scope, kebab "Edit access" on manager rows; a manager row click opens it too), a `CardList` of `ListCard`s on phones (a manager card tap opens it).

## EditAccessDrawer.tsx
- `EditAccessDrawer({ manager, onClose })`: loads GET /managers/:id/access, GET /settings/permissions and GET /properties. Properties checklist with "Select all" and a "{name} won't see any property." warning when none is picked; switches grouped by catalog `group` (catalog order) with "On by default"; "Reset to defaults" sets only the switches. Save sends one PUT with both full lists (permissions in catalog order), toasts and closes; backend errors (400) show at the top. Closing with unsaved changes opens a "Discard changes?" ConfirmDialog. Full screen on phones (Drawer). Mount only while open.

## access.ts
- `groupCatalog(catalog)`: items grouped by `group`, keeping the API order.
- `defaultKeys(catalog)`: the keys with `default: true`.
- `sameSet(a, b)`: true when both sets hold the same values (dirty check).
- `managerPropertyNames(id, properties)`: names (A→Z) of the properties whose embedded `managers` include the manager.
- `scopeText(manager, properties)`: "No properties", up to 2 names, or "N properties"; falls back to `assignedPropertyCount` without the list.

## hooks.ts
- `usePermissionCatalog()`: GET /settings/permissions (owner), kept 1 hour.
- `useManagerAccess(userId)`: GET /managers/:userId/access (owner).
- `useUpdateManagerAccess(userId)`: PUT /managers/:userId/access; then refreshes every `managers` query (list, access) and every `properties` query (lists, details, the Property page Managers card, the scope picker).

## keys.ts
- `settingsKeys`: `permissions`. Manager access is `managerKeys.access(userId)` in `features/properties/keys.ts`, so invalidating `managerKeys.all` covers it.
