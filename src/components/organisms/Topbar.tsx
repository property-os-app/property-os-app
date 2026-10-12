import * as React from "react";
import { Bell, Plus, Sparkles, Building2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button";
import { Avatar } from "@/components/atoms/Avatar";
import { SearchInput } from "@/components/molecules/SearchInput";
import { FilterChip } from "@/components/molecules/SegmentedControl";

export interface TopbarProps {
  title: string;
  scope: string;
  user: { name: string; avatarUrl?: string };
  unreadNotifications?: number;
  onSearch?: (query: string) => void;
  onAskAi?: () => void;
  onNotifications?: () => void;
  /** Quick-add menu: Payment, Lease, Expense, Ticket, Tenant. */
  onQuickAdd?: () => void;
  onProfile?: () => void;
  /** Hide the AI button for roles without AI surfaces. */
  showAi?: boolean;
  className?: string;
}

/** 64px sticky top bar: page title and scope chip, global search (⌘K), Ask AI, bell, quick add, profile. */
export function Topbar({ title, scope, user, unreadNotifications = 0, onSearch, onAskAi, onNotifications, onQuickAdd, onProfile, showAi = true, className }: TopbarProps) {
  return (
    <header className={cn("sticky top-0 z-10 flex h-topbar shrink-0 items-center gap-4 border-b border-border-subtle bg-bg px-8", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="whitespace-nowrap text-h3 font-bold">{title}</div>
        <FilterChip active className="hidden md:inline-flex"><Building2 size={16} strokeWidth={1.5} />{scope}</FilterChip>
      </div>
      <div className="mx-auto hidden w-full max-w-[520px] md:block">
        <SearchInput
          shortcut="⌘K"
          placeholder="Search tenants, units, leases, tickets…"
          aria-label="Search tenants, units, properties, leases, tickets, vendors"
          containerClassName="max-w-none"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {showAi && <Button variant="ai" size="sm" onClick={onAskAi} icon={<Sparkles size={16} strokeWidth={1.5} />}>Ask AI</Button>}
        <Button variant="ghost" iconOnly aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"} onClick={onNotifications} className="relative" icon={<Bell size={20} strokeWidth={1.5} />}>
          {unreadNotifications > 0 && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full border-2 border-bg bg-danger" />}
        </Button>
        <Button variant="primary" iconOnly aria-label="Quick add: payment, lease, expense, ticket, tenant" onClick={onQuickAdd} icon={<Plus size={20} strokeWidth={1.5} />} />
        <button type="button" aria-label="Profile menu" onClick={onProfile} className="rounded-full focus-visible:focus-ring">
          <Avatar name={user.name} src={user.avatarUrl} />
        </button>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-h1">{title}</h1>
          {description && <div className="mt-1 text-text-secondary">{description}</div>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
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
