import { Navigate, Outlet, useSearchParams } from "react-router";
import { useAuth } from "@/features/auth/authContext";
import { FullPageLoading } from "@/features/auth/FullPageLoading";

/** Only same-site paths: must start with "/" but not "//" or "/\" (those can point to another site). */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && next[1] !== "/" && next[1] !== "\\") return next;
  return "/";
}

/** Layout route for /login and /forgot-password: once signed in, goes to ?next= (or "/"). */
export function PublicOnly() {
  const { status } = useAuth();
  const [params] = useSearchParams();

  if (status === "loading") return <FullPageLoading />;
  if (status === "signedOut") return <Outlet />;
  // ready, needsVerification, notRegistered, error: RequireAuth shows the right screen there.
  return <Navigate to={safeNext(params.get("next"))} replace />;
}
