import * as React from "react";
import { Home, CreditCard, Wrench, MessageCircle, FileText, Bell, Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/atoms/Avatar";
import { Count } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";

/* ---------- Renter Portal: bottom tab bar (mobile) / left rail (desktop) ---------- */
export type RenterTab = "home" | "payments" | "maintenance" | "messages" | "lease";

export const renterTabs: { key: RenterTab; label: string; href: string; icon: React.ReactNode }[] = [
  { key: "home", label: "Home", href: "/renter", icon: <Home size={20} strokeWidth={1.5} /> },
  { key: "payments", label: "Payments", href: "/renter/payments", icon: <CreditCard size={20} strokeWidth={1.5} /> },
  { key: "maintenance", label: "Maintenance", href: "/renter/maintenance", icon: <Wrench size={20} strokeWidth={1.5} /> },
  { key: "messages", label: "Messages", href: "/renter/messages", icon: <MessageCircle size={20} strokeWidth={1.5} /> },
  { key: "lease", label: "Lease", href: "/renter/lease", icon: <FileText size={20} strokeWidth={1.5} /> },
];

export function RenterTabBar({ active, badges = {}, className }: { active: RenterTab; badges?: Partial<Record<RenterTab, number>>; className?: string }) {
  return (
    <nav aria-label="Renter navigation" className={cn("grid h-[72px] shrink-0 grid-cols-5 border-t border-border-subtle bg-surface-1", className)}>
      {renterTabs.map((t) => (
        <a
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn("relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold no-underline", t.key === active ? "text-success" : "text-text-muted")}
        >
          {t.icon}
          {t.label}
          {badges[t.key] ? <Count tone="danger" className="absolute right-3 top-2">{badges[t.key]}</Count> : null}
        </a>
      ))}
    </nav>
  );
}

/* ---------- Owner Portal: top navigation, no sidebar ---------- */
export type OwnerSection = "overview" | "properties" | "financials" | "documents" | "approvals" | "messages";

const ownerLinks: { key: OwnerSection; label: string; href: string }[] = [
  { key: "overview", label: "Overview", href: "/owner" },
  { key: "properties", label: "Properties", href: "/owner/properties" },
  { key: "financials", label: "Financials", href: "/owner/financials" },
  { key: "documents", label: "Statements and Documents", href: "/owner/documents" },
  { key: "approvals", label: "Approvals", href: "/owner/approvals" },
  { key: "messages", label: "Messages", href: "/owner/messages" },
];

export interface OwnerNavProps {
  active: OwnerSection;
  scope: string;
  onScopeClick?: () => void;
  user: { name: string; avatarUrl?: string };
  pendingApprovals?: number;
  className?: string;
}

export function OwnerNav({ active, scope, onScopeClick, user, pendingApprovals = 0, className }: OwnerNavProps) {
  return (
    <header className={cn("flex min-h-topbar flex-wrap items-center gap-6 border-b border-border-subtle bg-surface-1 px-8", className)}>
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-control bg-success text-body font-extrabold text-success-fg">P</div>
        <span className="font-extrabold">PropOS</span>
        <span className="text-caption text-text-muted">Owner</span>
      </div>
      <Button size="sm" onClick={onScopeClick} icon={<Building2 size={16} strokeWidth={1.5} />} iconRight={<ChevronDown size={16} strokeWidth={1.5} />}>{scope}</Button>
      <nav aria-label="Owner navigation" className="flex items-center gap-6">
        {ownerLinks.map((l) => (
          <a
            key={l.key}
            href={l.href}
            aria-current={l.key === active ? "page" : undefined}
            className={cn("inline-flex items-center gap-2 border-b-2 py-5 font-semibold no-underline", l.key === active ? "border-success text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary")}
          >
            {l.label}
            {l.key === "approvals" && pendingApprovals > 0 && <Count tone="danger">{pendingApprovals}</Count>}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" iconOnly aria-label="Notifications" icon={<Bell size={20} strokeWidth={1.5} />} />
        <Avatar name={user.name} src={user.avatarUrl} />
      </div>
    </header>
  );
}
