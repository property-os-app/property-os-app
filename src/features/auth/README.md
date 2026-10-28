# src/features/auth

Sign-in and who is signed in: the auth state, the route guards, the auth screens, Firebase error texts and role permissions. Error codes from the backend are always read from `ApiError.code`, never from message text.

## authContext.ts
- `AuthStatus`: `"loading" | "signedOut" | "needsVerification" | "notRegistered" | "ready" | "error"`.
- `AuthContextValue`: what `useAuth()` returns (status, Firebase user, `me`, error, login `notice`, `signIn`, `signOut`, `retry`, `recheckVerification`).
- `AuthContext`: the React context.
- `useAuth()`: reads the auth state; throws outside `AuthProvider`.

## AuthProvider.tsx
- `AuthProvider`: listens with `onAuthStateChanged`, then loads GET /auth/me (query key `["me", uid]`, reloaded every time the window gets focus, so a permission change by the owner shows without signing out) and turns both into one status. `EMAIL_NOT_VERIFIED` → needsVerification, `USER_NOT_REGISTERED` → notRegistered (stays signed in), role TENANT → signs out with "This portal is for staff.", other errors → error (stays signed in). `signIn` sets Firebase persistence (local or session) before signing in. `signOut` clears the saved scope, signs out of Firebase, keeps the login notice, then `queryClient.clear()`.

## session.ts
- Bridge so `queryClient.ts` (outside React) can sign out once.
- `SESSION_ENDED_MESSAGE`: "Your session ended. Please sign in again."
- `registerSignOut(fn)`: AuthProvider registers its signOut; returns the unregister function.
- `beginSessionEnd()`: true only for the first caller, so the toast shows once.
- `requestSignOut(notice)`: calls the registered signOut.
- `resetSessionEnd()`: re-arms it after a successful sign-in.

## RequireAuth.tsx
- `RequireAuth`: layout route guard. loading → `FullPageLoading`; signedOut → `/login?next=<path>`; needsVerification / notRegistered / error → the matching screen; ready → `<Outlet />`.

## PublicOnly.tsx
- `PublicOnly`: layout route for `/login` and `/forgot-password`. Once the user is signed in, redirects to `?next=` (only same-site paths starting with "/") or "/".

## AuthShell.tsx
- `AuthShell`: AuthLayout with the brand row (green "P" + PropertyOS), the title and description, and the brand panel on the right. Sets the tab title.

## LoginPage.tsx
- `LoginPage`: email + password (react-hook-form + zod), show/hide password, "Keep me signed in", "Forgot password?" link, errors and the login notice in an InlineError.

## ForgotPasswordPage.tsx
- `ForgotPasswordPage`: sends Firebase's reset email, then shows "Reset link sent to ...". `auth/user-not-found` also counts as sent.

## CheckEmailPage.tsx
- `CheckEmailPage`: "I've verified" (reload user, new token, retry /auth/me), "Resend email" (60 s wait after each send), "Sign out".

## NotRegisteredPage.tsx
- `NotRegisteredPage`: "Account not set up" with a Sign out button. No signup or role form.

## AuthErrorPage.tsx
- `AuthErrorPage`: full-page InlineError with Retry when /auth/me fails (server down, 500).

## FullPageLoading.tsx
- `FullPageLoading`: centered skeleton while the session restores or /auth/me loads.

## PasswordInput.tsx
- `PasswordInput`: design system `Input` + ghost eye button ("Show password" / "Hide password"). Works inside `FormField`.

## firebaseErrors.ts
- `signInErrorText(err)`: sign-in Firebase errors in simple words.
- `resetEmailErrorText(err)`: reset-email errors in simple words, or null when it should look like success.
- `verificationEmailErrorText(err)`: verification-email errors in simple words.

## permissions.ts
- `Action`: the actions the UI checks (`property.create`, `rent.generate`, `entry.void`, `template.manage`, `vendor.manage`, `expense.record`, `expense.approve`, `access.manage`, ...).
- `can(me, action)`: OWNER can do everything. PROPERTY_MANAGER only when the action's backend key (`ACTION_KEYS`, e.g. `unit.delete` → `units.delete`; `charge.create`, `payment.create`, `rent.generate` → `money.record`; `template.manage` → `templates.manage`, every lease template write, off by default for managers; `vendor.manage` → `vendors.manage`; `expense.record` → `expenses.record`, only the Add Expense button (every expense button comes from its `allowedActions`); `expense.approve` → `expenses.approve`; `entry.void` (`money.void`) also voids expenses) is in `me.permissions` from GET /auth/me. `property.delete`, `manager.assign` and `access.manage` are owner only. TENANT: nothing. Hide what's not allowed (never disable).
- `toSidebarRole(role)`: OWNER → "admin", PROPERTY_MANAGER → "manager".
- `roleLabel(role)`: "Owner", "Property Manager" (from `lib/labels.ts`).

## Tests (`npm test`)
- `permissions.test.ts`: `can()` for OWNER, TENANT and managers with and without keys (OWNER-only actions stay off; `leases.manage` alone doesn't grant `template.manage`, `expenses.record` doesn't grant `expense.approve`), `toSidebarRole`, `roleLabel`.
