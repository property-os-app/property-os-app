import { useState } from "react";
import { Link, Outlet, useMatches, useNavigate } from "react-router";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { defaultNavGroups, type ModuleKey, type NavGroup, type NavItem, type SidebarProps } from "@/components/organisms";
import { WorkspaceShell } from "@/components/templates";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { PageNavContext, PageTitleContext } from "@/app/pageTitle";
import { useAuth } from "@/features/auth/authContext";
import { roleLabel, toSidebarRole } from "@/features/auth/permissions";
import { ScopeProvider } from "@/features/scope/ScopeProvider";
import { useScope } from "@/features/scope/scopeContext";

/** Put on each route as `handle`: the page title (Topbar + tab) and the Sidebar item to highlight. */
export interface RouteHandle {
  title: string;
  nav?: ModuleKey;
}

// Reuse the design system's nav items (and icons), keeping only the modules we built.
const navItems = new Map(defaultNavGroups.flatMap((g) => g.items).map((item) => [item.key, item]));
const pick = (keys: ModuleKey[]): NavItem[] => keys.flatMap((key) => navItems.get(key) ?? []);

const navGroups: NavGroup[] = [
  { label: "Leasing", items: pick(["properties", "units", "tenants", "leases"]) },
  { label: "Money", items: pick(["rentroll"]) },
  { label: "Admin", items: pick(["settings"]) },
];

const renderLink: SidebarProps["renderLink"] = (href, props) => <Link to={href} {...props} />;

/** The handle of the deepest matched route that has one. */
function useRouteHandle(): RouteHandle {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i].handle as RouteHandle | undefined;
    if (handle?.title) return handle;
  }
  return { title: "PropertyOS" };
}

/** Signed-in layout: WorkspaceShell (Sidebar + Topbar) around the current page. */
export function AppLayout() {
  return (
    <ScopeProvider>
      <AppShell />
    </ScopeProvider>
  );
}

function AppShell() {
  const { me, signOut } = useAuth();
  const { label, openPicker } = useScope();
  const handle = useRouteHandle();
  const navigate = useNavigate();
  // A page may replace the route title (usePageTitle), e.g. the property detail shows the property name.
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const title = pageTitle ?? handle.title;
  // A page may also replace the Sidebar item (usePageNav), e.g. a lease opened from the Rent Roll highlights Rent Roll.
  const [pageNav, setPageNav] = useState<ModuleKey | null>(null);
  useDocumentTitle(title);

  // RequireAuth renders this layout only when status is "ready", so me is set.
  if (!me) return null;

  return (
    <WorkspaceShell
      sidebar={{
        role: toSidebarRole(me.role),
        // "dashboard" is not in our groups, so pages without a nav key highlight nothing.
        active: pageNav ?? handle.nav ?? "dashboard",
        user: { name: me.name, roleLabel: roleLabel(me.role) },
        scope: label,
        onScopeClick: openPicker,
        groups: navGroups,
        brand: "PropertyOS",
        renderLink,
      }}
      topbar={{
        title,
        scope: label,
        user: { name: me.name },
        showAi: false,
        profileMenu: [
          { label: me.email, disabled: true, onSelect: () => {} },
          { label: "Settings", icon: <SlidersHorizontal strokeWidth={1.5} />, onSelect: () => void navigate("/settings") },
          { label: "Sign out", icon: <LogOut strokeWidth={1.5} />, onSelect: () => void signOut() },
        ],
      }}
    >
      <PageTitleContext value={setPageTitle}>
        <PageNavContext value={setPageNav}>
          <Outlet />
        </PageNavContext>
      </PageTitleContext>
    </WorkspaceShell>
  );
}
