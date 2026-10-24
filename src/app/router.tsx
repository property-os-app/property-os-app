import type { ComponentType } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import type { RouteHandle } from "@/app/AppLayout";
import { AppLayout } from "@/app/AppLayout";
import { NotFoundPage } from "@/app/NotFoundPage";
import { PageSkeleton } from "@/app/PageSkeleton";
import { RouteErrorPage } from "@/app/RouteErrorPage";
import { FullPageLoading } from "@/features/auth/FullPageLoading";
import { PublicOnly } from "@/features/auth/PublicOnly";
import { RequireAuth } from "@/features/auth/RequireAuth";

const notFoundHandle: RouteHandle = { title: "Page not found" };
const dashboardHandle: RouteHandle = { title: "Dashboard", nav: "dashboard" };
const unitsHandle: RouteHandle = { title: "Units", nav: "units" };
const tenantsHandle: RouteHandle = { title: "Tenants", nav: "tenants" };
const leasesHandle: RouteHandle = { title: "Leases", nav: "leases" };
const rentRollHandle: RouteHandle = { title: "Rent Roll", nav: "rentroll" };
const settingsHandle: RouteHandle = { title: "Settings", nav: "settings" };
const usersHandle: RouteHandle = { title: "Users and Permissions", nav: "settings" };
const templatesHandle: RouteHandle = { title: "Lease templates", nav: "settings" };
const propertiesHandle: RouteHandle = { title: "Properties", nav: "properties" };
// The detail page replaces this title with the property name (usePageTitle).
const propertyHandle: RouteHandle = { title: "Property", nav: "properties" };
// The lease page replaces this title with "Lease {leaseNumber}".
const leaseHandle: RouteHandle = { title: "Lease", nav: "leases" };

/**
 * A route whose page is downloaded the first time it opens (its own JS file). `fallback` shows while it downloads on the
 * first load of the app; later navigations show PageSkeleton from AppLayout. A failed download goes to the errorElement.
 */
function lazyPage(load: () => Promise<ComponentType>, fallback = <PageSkeleton />): Pick<RouteObject, "lazy" | "hydrateFallbackElement"> {
  return {
    lazy: async () => ({ Component: await load() }),
    hydrateFallbackElement: fallback,
  };
}

/** All routes (library / data mode). */
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage fullPage />,
    children: [
      {
        // Public: a signed-in user is sent on to ?next= or "/".
        element: <PublicOnly />,
        children: [
          { path: "/login", ...lazyPage(() => import("@/features/auth/LoginPage").then((m) => m.LoginPage), <FullPageLoading />) },
          {
            path: "/forgot-password",
            ...lazyPage(() => import("@/features/auth/ForgotPasswordPage").then((m) => m.ForgotPasswordPage), <FullPageLoading />),
          },
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
                // Page errors (and failed page downloads) render inside the shell.
                errorElement: <RouteErrorPage />,
                children: [
                  { index: true, handle: dashboardHandle, ...lazyPage(() => import("@/features/dashboard/DashboardPage").then((m) => m.DashboardPage)) },
                  { path: "properties", handle: propertiesHandle, ...lazyPage(() => import("@/features/properties/PropertiesPage").then((m) => m.PropertiesPage)) },
                  {
                    path: "properties/:id",
                    handle: propertyHandle,
                    ...lazyPage(() => import("@/features/properties/PropertyDetailPage").then((m) => m.PropertyDetailPage)),
                  },
                  { path: "units", handle: unitsHandle, ...lazyPage(() => import("@/features/units/UnitsPage").then((m) => m.UnitsPage)) },
                  { path: "tenants", handle: tenantsHandle, ...lazyPage(() => import("@/features/tenants/TenantsPage").then((m) => m.TenantsPage)) },
                  { path: "leases", handle: leasesHandle, ...lazyPage(() => import("@/features/leases/LeasesPage").then((m) => m.LeasesPage)) },
                  { path: "leases/:id", handle: leaseHandle, ...lazyPage(() => import("@/features/leases/LeasePage").then((m) => m.LeasePage)) },
                  { path: "rent-roll", handle: rentRollHandle, ...lazyPage(() => import("@/features/rent-roll/RentRollPage").then((m) => m.RentRollPage)) },
                  { path: "settings", handle: settingsHandle, ...lazyPage(() => import("@/features/settings/SettingsPage").then((m) => m.SettingsPage)) },
                  { path: "settings/users", handle: usersHandle, ...lazyPage(() => import("@/features/settings/UsersPage").then((m) => m.UsersPage)) },
                  { path: "settings/templates", handle: templatesHandle, ...lazyPage(() => import("@/features/lease-templates/TemplatesPage").then((m) => m.TemplatesPage)) },
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
