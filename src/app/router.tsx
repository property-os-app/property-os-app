import { createBrowserRouter, Navigate } from "react-router";
import type { RouteHandle } from "@/app/AppLayout";
import { AppLayout } from "@/app/AppLayout";
import { NotFoundPage } from "@/app/NotFoundPage";
import { RouteErrorPage } from "@/app/RouteErrorPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { LeasePage } from "@/features/leases/LeasePage";
import { LeasesPage } from "@/features/leases/LeasesPage";
import { PublicOnly } from "@/features/auth/PublicOnly";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { PropertiesPage } from "@/features/properties/PropertiesPage";
import { PropertyDetailPage } from "@/features/properties/PropertyDetailPage";
import { RentRollPage } from "@/features/rent-roll/RentRollPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { TenantsPage } from "@/features/tenants/TenantsPage";
import { UnitsPage } from "@/features/units/UnitsPage";

const notFoundHandle: RouteHandle = { title: "Page not found" };
const unitsHandle: RouteHandle = { title: "Units", nav: "units" };
const tenantsHandle: RouteHandle = { title: "Tenants", nav: "tenants" };
const leasesHandle: RouteHandle = { title: "Leases", nav: "leases" };
const rentRollHandle: RouteHandle = { title: "Rent Roll", nav: "rentroll" };
const settingsHandle: RouteHandle = { title: "Settings", nav: "settings" };
const propertiesHandle: RouteHandle = { title: "Properties", nav: "properties" };
// The detail page replaces this title with the property name (usePageTitle).
const propertyHandle: RouteHandle = { title: "Property", nav: "properties" };
// The lease page replaces this title with "Lease {leaseNumber}".
const leaseHandle: RouteHandle = { title: "Lease", nav: "leases" };

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
                  { path: "properties", handle: propertiesHandle, element: <PropertiesPage /> },
                  { path: "properties/:id", handle: propertyHandle, element: <PropertyDetailPage /> },
                  { path: "units", handle: unitsHandle, element: <UnitsPage /> },
                  { path: "tenants", handle: tenantsHandle, element: <TenantsPage /> },
                  { path: "leases", handle: leasesHandle, element: <LeasesPage /> },
                  { path: "leases/:id", handle: leaseHandle, element: <LeasePage /> },
                  { path: "rent-roll", handle: rentRollHandle, element: <RentRollPage /> },
                  { path: "settings", handle: settingsHandle, element: <SettingsPage /> },
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
