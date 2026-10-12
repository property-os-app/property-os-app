import { createContext, useContext } from "react";
import type { User } from "firebase/auth";
import type { Me } from "@/types/auth";

/** Where the signed-in user is in the auth flow. RequireAuth renders one screen per status. */
export type AuthStatus = "loading" | "signedOut" | "needsVerification" | "notRegistered" | "ready" | "error";

export interface AuthContextValue {
  status: AuthStatus;
  /** True only until Firebase has restored the saved session (first page load). */
  isRestoring: boolean;
  /** The Firebase user, or null when signed out. */
  firebaseUser: User | null;
  /** GET /auth/me, only when status is "ready". */
  me: Me | null;
  /** The error behind status "error". */
  error: unknown;
  /** Message for the login page that survives sign-out (staff only, session ended). */
  notice: string | null;
  signIn: (email: string, password: string, keepSignedIn: boolean) => Promise<void>;
  /** Firebase sign-out, clears the query cache and the property scope. `notice` shows on the login page. */
  signOut: (notice?: string) => Promise<void>;
  /** Loads GET /auth/me again (status "error"). */
  retry: () => Promise<void>;
  /** Reloads the Firebase user, forces a new token, then loads GET /auth/me again. True when the email is now verified. */
  recheckVerification: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Reads the auth state. Only works inside AuthProvider. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
