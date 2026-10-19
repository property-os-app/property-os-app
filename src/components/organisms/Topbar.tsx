import * as React from "react";
import { Bell, Plus, Sparkles, Building2, Menu } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button";
import { Avatar } from "@/components/atoms/Avatar";
import { SearchInput } from "@/components/molecules/SearchInput";
import { FilterChip } from "@/components/molecules/SegmentedControl";
import { KebabMenu, type MenuItem } from "@/components/molecules/Menu";

export interface TopbarProps {
  title: string;
  scope: string;
  user: { name: string; avatarUrl?: string };
  unreadNotifications?: number;
  /** Search box renders only when this is passed. */
  onSearch?: (query: string) => void;
  onAskAi?: () => void;
  /** Bell renders only when this is passed. */
  onNotifications?: () => void;
  /** Renders only when passed. Quick-add menu: Payment, Lease, Expense, Ticket, Tenant. */
  onQuickAdd?: () => void;
  onProfile?: () => void;
  /** When passed, clicking the avatar opens a menu with these items (instead of calling onProfile). */
  profileMenu?: MenuItem[];
  /** Hide the AI button for roles without AI surfaces. */
  showAi?: boolean;
  /** Shows the "Open menu" button below the lg breakpoint (where the sidebar is hidden). */
  onMenu?: () => void;
  /** Extra content just left of the avatar (e.g. a ThemeSwitch). */
  endSlot?: React.ReactNode;
  className?: string;
}

/** 64px sticky top bar: page title and scope chip, global search (⌘K), Ask AI, bell, quick add, profile. */
export function Topbar({ title, scope, user, unreadNotifications = 0, onSearch, onAskAi, onNotifications, onQuickAdd, onProfile, profileMenu, showAi = true, onMenu, endSlot, className }: TopbarProps) {
  return (
    <header className={cn("sticky top-0 z-10 flex h-topbar shrink-0 items-center gap-4 border-b border-border-subtle bg-bg px-4 lg:px-8", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {onMenu && (
          <Button
            variant="ghost"
            iconOnly
            aria-label="Open menu"
            className="-ml-2 shrink-0 lg:hidden"
            icon={<Menu size={20} strokeWidth={1.5} />}
            // Focus the button first (Safari doesn't on click), so the menu returns focus here when it closes.
            onClick={(e) => {
              e.currentTarget.focus();
              onMenu();
            }}
          />
        )}
        <div className="truncate text-h3 font-bold">{title}</div>
        <FilterChip active className="hidden md:inline-flex"><Building2 size={16} strokeWidth={1.5} />{scope}</FilterChip>
      </div>
      {onSearch && (
        <div className="mx-auto hidden w-full max-w-[520px] md:block">
          <SearchInput
            shortcut="⌘K"
            placeholder="Search tenants, units, leases, tickets…"
            aria-label="Search tenants, units, properties, leases, tickets, vendors"
            containerClassName="max-w-none"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {showAi && <Button variant="ai" size="sm" onClick={onAskAi} icon={<Sparkles size={16} strokeWidth={1.5} />}>Ask AI</Button>}
        {onNotifications && (
          <Button variant="ghost" iconOnly aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"} onClick={onNotifications} className="relative" icon={<Bell size={20} strokeWidth={1.5} />}>
            {unreadNotifications > 0 && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full border-2 border-bg bg-danger" />}
          </Button>
        )}
        {onQuickAdd && <Button variant="primary" iconOnly aria-label="Quick add: payment, lease, expense, ticket, tenant" onClick={onQuickAdd} icon={<Plus size={20} strokeWidth={1.5} />} />}
        {endSlot}
        {profileMenu ? (
          <KebabMenu items={profileMenu} label="Profile menu" trigger={<Avatar name={user.name} src={user.avatarUrl} />} />
        ) : (
          <button type="button" aria-label="Profile menu" onClick={onProfile} className="rounded-full focus-visible:focus-ring">
            <Avatar name={user.name} src={user.avatarUrl} />
          </button>
        )}
      </div>
    </header>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Exactly one primary button per view; put secondary actions first. */
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0 text-h1">{title}</h1>
          {description && <div className="mt-1 text-text-secondary">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/** Toolbar row: search, filter chips, view switcher, export. Wraps on narrow screens. */
export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>;
}

/** Up to four KPI cards; 2 per row on tablet, scrollable on mobile. */
export function KpiRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>{children}</div>;
}
