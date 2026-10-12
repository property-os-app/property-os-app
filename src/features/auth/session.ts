/**
 * Bridge between plain TS code (queryClient.ts, outside React) and AuthProvider's signOut.
 * Makes sure an expired session is handled once, even when many requests fail together.
 */

export const SESSION_ENDED_MESSAGE = "Your session ended. Please sign in again.";

type SignOutFn = (notice: string) => void;

let signOutFn: SignOutFn | null = null;
let ending = false;

/** AuthProvider registers its signOut here. Returns the unregister function. */
export function registerSignOut(fn: SignOutFn): () => void {
  signOutFn = fn;
  return () => {
    if (signOutFn === fn) signOutFn = null;
  };
}

/** True only for the first caller until resetSessionEnd(). Use it to toast once. */
export function beginSessionEnd(): boolean {
  if (ending) return false;
  ending = true;
  return true;
}

/** Signs out through AuthProvider, keeping `notice` for the login page. */
export function requestSignOut(notice: string): void {
  signOutFn?.(notice);
}

/** Called after a successful sign-in, so the next expired session is handled again. */
export function resetSessionEnd(): void {
  ending = false;
}
