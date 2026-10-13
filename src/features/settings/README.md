# src/features/settings

User preferences saved on this device. For now only the theme (Light / Dark / System). No API: nothing here talks to the backend.

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

## SettingsPage.tsx
- `SettingsPage`: `/settings`. PageHeader, `SettingsLayout` with one section ("General"), and an "Appearance" card with a Theme `SegmentedControl` (Dark / Light / System). Applies right away, no Save button, no toast.
