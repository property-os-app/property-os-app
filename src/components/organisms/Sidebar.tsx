import * as React from "react";
import {
  X, LayoutGrid, Activity, Building2, DoorOpen, Users, FileText, DollarSign, Receipt, Landmark, BarChart3,
  Wrench, Truck, Inbox, MessageCircle, ShieldCheck, Database, SlidersHorizontal, CircleHelp, ChevronDown, ChevronLeft, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/atoms/Avatar";
import { Count } from "@/components/atoms/Badge";

/** Roles from the access matrix. Hidden modules are removed from navigation, never disabled. */
export type Role = "admin" | "manager" | "leasing" | "maintenance" | "accountant";

export type ModuleKey =
  | "dashboard" | "timeline" | "properties" | "units" | "tenants" | "leases" | "rentroll" | "expenses" | "finance" | "reports"
  | "maintenance" | "vendors" | "inbox" | "chat" | "audit" | "backup" | "settings" | "help";

export interface NavItem {
  key: ModuleKey;
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const icon = (I: LucideIcon) => <I size={20} strokeWidth={1.5} />;

/** Default group order is fixed by the guideline. Override `groups` only to change hrefs. */
export const defaultNavGroups: NavGroup[] = [
  { label: "Overview", items: [
    { key: "dashboard", label: "Dashboard", href: "/", icon: icon(LayoutGrid) },
    { key: "timeline", label: "Activity Timeline", href: "/activity", icon: icon(Activity) },
  ] },
  { label: "Leasing", items: [
    { key: "properties", label: "Properties", href: "/properties", icon: icon(Building2) },
    { key: "units", label: "Units", href: "/units", icon: icon(DoorOpen) },
    { key: "tenants", label: "Tenants", href: "/tenants", icon: icon(Users) },
    { key: "leases", label: "Leases", href: "/leases", icon: icon(FileText) },
  ] },
  { label: "Money", items: [
    { key: "rentroll", label: "Rent Roll", href: "/rent-roll", icon: icon(DollarSign) },
    { key: "expenses", label: "Expenses", href: "/expenses", icon: icon(Receipt) },
    { key: "finance", label: "Finance", href: "/finance", icon: icon(Landmark) },
    { key: "reports", label: "Reports", href: "/reports", icon: icon(BarChart3) },
  ] },
  { label: "Operations", items: [
    { key: "maintenance", label: "Maintenance", href: "/maintenance", icon: icon(Wrench) },
    { key: "vendors", label: "Vendors", href: "/vendors", icon: icon(Truck) },
  ] },
  { label: "Communication", items: [
    { key: "inbox", label: "Inbox", href: "/inbox", icon: icon(Inbox) },
    { key: "chat", label: "Chat", href: "/chat", icon: icon(MessageCircle) },
  ] },
  { label: "Admin", items: [
    { key: "audit", label: "Audit Log", href: "/audit-log", icon: icon(ShieldCheck) },
    { key: "backup", label: "Backup and Export", href: "/backup", icon: icon(Database) },
    { key: "settings", label: "Settings", href: "/settings", icon: icon(SlidersHorizontal) },
    { key: "help", label: "Help Center", href: "/help", icon: icon(CircleHelp) },
  ] },
];

/** Module visibility per role (section 2 of the guideline). */
export const roleModules: Record<Role, ModuleKey[]> = {
  admin: ["dashboard","timeline","properties","units","tenants","leases","rentroll","expenses","finance","reports","maintenance","vendors","inbox","chat","audit","backup","settings","help"],
  manager: ["dashboard","timeline","properties","units","tenants","leases","rentroll","expenses","finance","reports","maintenance","vendors","inbox","chat","audit","settings","help"],
  leasing: ["dashboard","timeline","properties","units","tenants","leases","rentroll","maintenance","inbox","chat","help"],
  maintenance: ["dashboard","timeline","properties","units","tenants","expenses","maintenance","vendors","inbox","chat","help"],
  accountant: ["dashboard","timeline","properties","units","tenants","leases","rentroll","expenses","finance","reports","maintenance","vendors","help"],
};

export interface SidebarProps {
  role: Role;
  /** The highlighted item; leave it out to highlight nothing (e.g. a "not found" page). */
  active?: ModuleKey;
  user: { name: string; roleLabel: string; avatarUrl?: string };
  /** Current scope label shown in the scope switcher, e.g. "All properties". */
  scope: string;
  onScopeClick?: () => void;
  badges?: Partial<Record<ModuleKey, { count: number; tone?: "neutral" | "danger" }>>;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  groups?: NavGroup[];
  /** Brand text next to the logo. Default "PropOS". */
  brand?: string;
  /** Render links with your router: (href, props) => <Link to={href} {...props} /> */
  renderLink?: (href: string, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) => React.ReactNode;
  /** Called after a nav item is clicked (the mobile menu closes itself). */
  onNavigate?: () => void;
  /** Shows a "Close menu" button next to the brand (the sidebar inside the mobile menu). */
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ role, active, user, scope, onScopeClick, badges = {}, collapsed = false, onToggleCollapsed, groups = defaultNavGroups, brand = "PropOS", renderLink, onNavigate, onClose, className }: SidebarProps) {
  const allowed = roleModules[role];
  const link = renderLink ?? ((href, props) => <a href={href} {...props} />);
  return (
    <nav
      aria-label="Main navigation"
      className={cn("flex h-full shrink-0 flex-col border-r border-border-subtle bg-surface-1 transition-[width] duration-fast", collapsed ? "w-sidebar-collapsed" : "w-sidebar", className)}
    >
      <div className={cn("flex h-topbar items-center gap-2.5", collapsed ? "justify-center" : "px-5")}>
        <div className="flex size-7 items-center justify-center rounded-control bg-success text-body font-extrabold text-success-fg">P</div>
        {!collapsed && <div className="text-h3 font-extrabold tracking-tight">{brand}</div>}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close menu" className="ml-auto rounded-control p-1.5 text-text-secondary hover:bg-surface-3 hover:text-text-primary focus-visible:focus-ring">
            <X size={20} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onScopeClick}
        aria-label={`Switch property scope, currently ${scope}`}
        title={collapsed ? scope : undefined}
        className={cn("mx-4 mb-2 flex h-11 items-center gap-2.5 rounded-control border border-border-strong bg-surface-2 px-3 text-small font-semibold text-text-primary hover:bg-surface-3 focus-visible:focus-ring", collapsed && "mx-3 justify-center px-0")}
      >
        <Building2 size={16} strokeWidth={1.5} />
        {!collapsed && <><span className="flex-1 truncate text-left">{scope}</span><ChevronDown size={16} strokeWidth={1.5} /></>}
      </button>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto pb-3">
        {groups.map((g) => {
          const items = g.items.filter((it) => allowed.includes(it.key));
          if (!items.length) return null;
          return (
            <div key={g.label} className="flex flex-col gap-0.5 px-3 pt-2">
              {!collapsed && <div className="px-3 pb-1 pt-2 text-overline uppercase text-text-muted">{g.label}</div>}
              {items.map((it) => {
                const on = it.key === active;
                const badge = badges[it.key];
                return (
                  <React.Fragment key={it.key}>
                    {link(it.href, {
                      "aria-current": on ? "page" : undefined,
                      title: collapsed ? it.label : undefined,
                      onClick: onNavigate,
                      className: cn(
                        "relative flex h-10 items-center gap-3 rounded-control px-3 text-body font-medium no-underline transition-colors duration-fast focus-visible:focus-ring",
                        on ? "bg-surface-3 text-text-primary shadow-[inset_2px_0_0_var(--success)]" : "text-text-secondary hover:bg-surface-3 hover:text-text-primary",
                        collapsed && "justify-center px-0",
                      ),
                      children: (
                        <>
                          {it.icon}
                          {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                          {badge && !collapsed && <Count tone={badge.tone}>{badge.count}</Count>}
                          {badge && collapsed && <span aria-label={`${badge.count} unread`} className={cn("absolute right-2 top-2 size-2 rounded-full", badge.tone === "danger" ? "bg-danger" : "bg-success")} />}
                        </>
                      ),
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className={cn("flex items-center gap-3 border-t border-border-subtle px-4 py-3", collapsed && "justify-center px-0")}>
        <Avatar name={user.name} src={user.avatarUrl} online />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{user.name}</div>
            <div className="text-caption text-text-secondary">{user.roleLabel}</div>
          </div>
        )}
        {onToggleCollapsed && (
          <button type="button" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="rounded-control p-1.5 text-text-secondary hover:bg-surface-3 hover:text-text-primary focus-visible:focus-ring">
            {collapsed ? <ChevronRight size={16} strokeWidth={1.5} /> : <ChevronLeft size={16} strokeWidth={1.5} />}
          </button>
        )}
      </div>
    </nav>
  );
}
