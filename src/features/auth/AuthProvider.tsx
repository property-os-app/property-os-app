import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  reload,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { ApiError, apiFetch } from "@/lib/api";
import { auth } from "@/lib/firebase";
import type { Me } from "@/types/auth";
import { AuthContext, type AuthContextValue, type AuthStatus } from "@/features/auth/authContext";
import { registerSignOut, resetSessionEnd } from "@/features/auth/session";
import { clearSavedScope } from "@/features/scope/scopeStorage";

const STAFF_ONLY_MESSAGE = "This portal is for staff.";

function codeOf(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined;
}

/** Holds who is signed in: the Firebase user plus GET /auth/me, turned into one AuthStatus. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // undefined = Firebase hasn't restored the saved session yet.
  const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (user) => setFirebaseUser(user)), []);

  const uid = firebaseUser?.uid;
  const meQuery = useQuery({
    queryKey: ["me", uid],
    queryFn: ({ signal }) => apiFetch<Me>("/auth/me", { signal }),
    enabled: Boolean(uid),
    staleTime: 5 * 60_000,
    // Permissions can change any time (the Owner's Settings page): reload on every return to the tab, ignoring staleTime.
    refetchOnWindowFocus: "always",
  });

  const errorCode = codeOf(meQuery.error);
  const isTenant = Boolean(firebaseUser) && meQuery.data?.role === "TENANT";

  let status: AuthStatus;
  if (firebaseUser === undefined) status = "loading";
  else if (firebaseUser === null) status = "signedOut";
  else if (errorCode === "EMAIL_NOT_VERIFIED") status = "needsVerification";
  else if (errorCode === "USER_NOT_REGISTERED") status = "notRegistered";
  // Token errors: queryClient.ts signs out; tenants: the effect below signs out. Show loading meanwhile.
  else if (errorCode === "MISSING_TOKEN" || errorCode === "INVALID_TOKEN" || isTenant) status = "loading";
  else if (meQuery.data) status = "ready";
  else if (meQuery.isError) status = "error";
  else status = "loading";

  const signOut = useCallback(
    async (nextNotice?: string) => {
      clearSavedScope();
      await firebaseSignOut(auth);
      // Set after the await: signOut also runs from an effect (tenant), where a synchronous setState is not allowed.
      setNotice(nextNotice ?? null);
      // Drop every cached response so the next user never sees old data.
      queryClient.clear();
    },
    [queryClient],
  );

  const signIn = useCallback(async (email: string, password: string, keepSignedIn: boolean) => {
    await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    resetSessionEnd();
    setNotice(null);
  }, []);

  const { refetch } = meQuery;

  const retry = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const recheckVerification = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return false;
    await reload(user);
    await user.getIdToken(true);
    const result = await refetch();
    return codeOf(result.error) !== "EMAIL_NOT_VERIFIED";
  }, [refetch]);

  // queryClient.ts (outside React) signs out through this when the token is missing or invalid.
  useEffect(() => registerSignOut((n) => void signOut(n)), [signOut]);

  // A TENANT signed in: sign out (an external system: Firebase) and keep the staff message for the login page.
  useEffect(() => {
    // signOut only sets state after its first await, so nothing renders synchronously here; the rule can't see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isTenant) void signOut(STAFF_ONLY_MESSAGE);
  }, [isTenant, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isRestoring: firebaseUser === undefined,
      firebaseUser: firebaseUser ?? null,
      me: status === "ready" ? (meQuery.data ?? null) : null,
      error: meQuery.error,
      notice,
      signIn,
      signOut,
      retry,
      recheckVerification,
    }),
    [status, firebaseUser, meQuery.data, meQuery.error, notice, signIn, signOut, retry, recheckVerification],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
