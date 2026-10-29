import { useState } from "react";
import { Link, Outlet, ScrollRestoration, useLocation, useMatches, useNavigate, useNavigation } from "react-router";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { defaultNavGroups, type ModuleKey, type NavGroup, type NavItem, type SidebarProps } from "@/components/organisms";
import { ThemeSwitch } from "@/components/molecules";
import { WorkspaceShell } from "@/components/templates";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { PageNavContext, PageTitleContext } from "@/app/pageTitle";
import { PageSkeleton } from "@/app/PageSkeleton";
import { useAuth } from "@/features/auth/authContext";
import { roleLabel, toSidebarRole } from "@/features/auth/permissions";
import { ScopeProvider } from "@/features/scope/ScopeProvider";
import { useScope } from "@/features/scope/scopeContext";
import { useTheme } from "@/features/settings/themeContext";
import { changeThemeWithReveal } from "@/features/settings/themeReveal";
import { useTicketSummary } from "@/features/maintenance/hooks";

/** Put on each route as `handle`: the page title (Topbar + tab) and the Sidebar item to highlight. */
export interface RouteHandle {
  title: string;
  nav?: ModuleKey;
}

// Reuse the design system's nav items (and icons), keeping only the modules we built.
const navItems = new Map(defaultNavGroups.flatMap((g) => g.items).map((item) => [item.key, item]));
const pick = (keys: ModuleKey[]): NavItem[] => keys.flatMap((key) => navItems.get(key) ?? []);

const navGroups: NavGroup[] = [
  { label: "Overview", items: pick(["dashboard"]) },
  { label: "Leasing", items: pick(["properties", "units", "tenants", "leases"]) },
  { label: "Money", items: pick(["rentroll", "expenses"]) },
  { label: "Operations", items: pick(["maintenance", "vendors"]) },
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

/** Signed-in layout: WorkspaceShell (Sidebar + Topbar, mobile menu) around the current page, plus scroll restoration. */
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
  const { resolved, setPreference } = useTheme();
  const handle = useRouteHandle();
  const navigate = useNavigate();
  // A page may replace the route title (usePageTitle), e.g. the property detail shows the property name.
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const title = pageTitle ?? handle.title;
  // A page may also replace the Sidebar item (usePageNav), e.g. a lease opened from the Rent Roll highlights Rent Roll.
  const [pageNav, setPageNav] = useState<ModuleKey | null>(null);
  useDocumentTitle(title);

  // Mobile menu (below lg). Owned here so other openers (a phone tab bar) can use it too. Closes when the page changes.
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMenuOpen(false);
  }

  // A page opened for the first time downloads its code (lazy route): show a skeleton instead of the old page meanwhile.
  const navigation = useNavigation();
  const pageLoading = navigation.state === "loading" && navigation.location.pathname !== location.pathname;

  // Maintenance badge: open emergencies over everything the user can see (not the sidebar property). Refetches on window
  // focus (query default) and after every ticket write (refreshAfterTicketChange). Hidden at 0 and while loading.
  const emergencies = useTicketSummary({}).data?.emergency.openCount ?? 0;

  // RequireAuth renders this layout only when status is "ready", so me is set.
  if (!me) return null;

  return (
    <WorkspaceShell
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      sidebar={{
        role: toSidebarRole(me.role),
        // Pages without a nav key (not found) highlight nothing.
        active: pageNav ?? handle.nav,
        user: { name: me.name, roleLabel: roleLabel(me.role) },
        scope: label,
        onScopeClick: openPicker,
        groups: navGroups,
        badges: emergencies > 0 ? { maintenance: { count: emergencies, tone: "danger" } } : undefined,
        brand: "PropertyOS",
        renderLink,
      }}
      topbar={{
        title,
        scope: label,
        user: { name: me.name },
        showAi: false,
        // Flips what is showing now (also from "system"); Settings shows the new Light / Dark choice.
        endSlot: <ThemeSwitch checked={resolved === "dark"} onChange={(dark, e) => changeThemeWithReveal(e.currentTarget, dark, setPreference)} />,
        profileMenu: [
          { label: me.email, disabled: true, onSelect: () => {} },
          { label: "Settings", icon: <SlidersHorizontal strokeWidth={1.5} />, onSelect: () => void navigate("/settings") },
          { label: "Sign out", icon: <LogOut strokeWidth={1.5} />, onSelect: () => void signOut() },
        ],
      }}
    >
      <PageTitleContext value={setPageTitle}>
        <PageNavContext value={setPageNav}>
          {pageLoading ? <PageSkeleton /> : <Outlet />}
        </PageNavContext>
      </PageTitleContext>
      {/* Back restores the window scroll of that entry; a new page starts at the top. Table changes pass preventScrollReset. */}
      <ScrollRestoration />
    </WorkspaceShell>
  );
}
