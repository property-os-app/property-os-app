import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import type { ModuleKey } from "@/components/organisms";
import type { RouteHandle } from "@/app/AppLayout";
import { AppLayout } from "@/app/AppLayout";
import { ComingSoonPage } from "@/app/ComingSoonPage";
import { NotFoundPage } from "@/app/NotFoundPage";
import { RouteErrorPage } from "@/app/RouteErrorPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { PublicOnly } from "@/features/auth/PublicOnly";
import { RequireAuth } from "@/features/auth/RequireAuth";

/** A placeholder page with its title and Sidebar item. */
function comingSoon(path: string, title: string, nav: ModuleKey): RouteObject {
  const handle: RouteHandle = { title, nav };
  return { path, handle, element: <ComingSoonPage title={title} /> };
}

const notFoundHandle: RouteHandle = { title: "Page not found" };

/** All routes (library / data mode). */
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage fullPage />,
    children: [
      {
        // Public: a signed-in user is sent on to ?next= or "/".
        element: <PublicOnly />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      {
        // Signed in: RequireAuth (guard) + AppLayout (shell, rendered once).
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                // Page errors render inside the shell.
                errorElement: <RouteErrorPage />,
                children: [
                  { index: true, element: <Navigate to="/properties" replace /> },
                  comingSoon("properties", "Properties", "properties"),
                  comingSoon("units", "Units", "units"),
                  comingSoon("tenants", "Tenants", "tenants"),
                  comingSoon("leases", "Leases", "leases"),
                  comingSoon("rent-roll", "Rent Roll", "rentroll"),
                  { path: "*", handle: notFoundHandle, element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
