import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/features/auth/authContext";
import { AuthErrorPage } from "@/features/auth/AuthErrorPage";
import { CheckEmailPage } from "@/features/auth/CheckEmailPage";
import { FullPageLoading } from "@/features/auth/FullPageLoading";
import { NotRegisteredPage } from "@/features/auth/NotRegisteredPage";

/** Layout route for every signed-in page: renders the child routes only when status is "ready". */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  switch (status) {
    case "loading":
      return <FullPageLoading />;
    case "signedOut": {
      const next = location.pathname + location.search;
      return <Navigate to={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} replace />;
    }
    case "needsVerification":
      return <CheckEmailPage />;
    case "notRegistered":
      return <NotRegisteredPage />;
    case "error":
      return <AuthErrorPage />;
    case "ready":
      return <Outlet />;
  }
}
