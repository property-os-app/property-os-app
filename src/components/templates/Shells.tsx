import * as React from "react";
import { cn } from "@/lib/cn";
import { Sidebar, type SidebarProps } from "@/components/organisms/Sidebar";
import { Topbar, type TopbarProps } from "@/components/organisms/Topbar";
import { OwnerNav, type OwnerNavProps, RenterTabBar, type RenterTab } from "@/components/organisms/PortalNav";

/* ---------- Management Workspace: sidebar + sticky top bar + scrolling content ---------- */
export interface WorkspaceShellProps {
  sidebar: SidebarProps;
  topbar: TopbarProps;
  /** Optional banner under the top bar (unsaved / offline). */
  banner?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Page anatomy inside `children`: PageHeader, KpiRow, Toolbar, content, then Drawer/Modal rendered by the page.
 * Content column is capped at 1440px and centered on wide screens.
 */
export function WorkspaceShell({ sidebar, topbar, banner, children, className }: WorkspaceShellProps) {
  return (
    <div className={cn("flex min-h-screen bg-bg text-text-primary", className)}>
      <div className="sticky top-0 hidden h-screen md:block">
        <Sidebar {...sidebar} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar {...topbar} />
        {banner}
        <main className="mx-auto flex w-full max-w-content flex-col gap-6 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

/* ---------- Owner Portal: top navigation, calm, mostly read-only ---------- */
export function OwnerShell({ nav, children, className }: { nav: OwnerNavProps; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-bg text-text-primary", className)}>
      <OwnerNav {...nav} />
      <main className="mx-auto flex w-full max-w-content flex-col gap-6 p-4 md:p-8">{children}</main>
    </div>
  );
}

/* ---------- Renter Portal: mobile first, bottom tab bar ---------- */
export interface RenterShellProps {
  active: RenterTab;
  header?: React.ReactNode;
  badges?: Partial<Record<RenterTab, number>>;
  children: React.ReactNode;
  className?: string;
}

/** 16px body text, 48px primary buttons, generous spacing. Never shows other tenants, internal notes, vendor costs or AI panels. */
export function RenterShell({ active, header, badges, children, className }: RenterShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-bg text-body-lg text-text-primary md:mx-auto md:max-w-[480px]", className)}>
      {header && <div className="flex items-center justify-between gap-3 px-4 pt-5">{header}</div>}
      <main className="flex flex-1 flex-col gap-4 p-4 pb-24">{children}</main>
      <div className="fixed inset-x-0 bottom-0 md:mx-auto md:max-w-[480px]">
        <RenterTabBar active={active} badges={badges} />
      </div>
    </div>
  );
}

/* ---------- Authentication: form left (max 400px), brand panel right, hidden on mobile ---------- */
export function AuthLayout({ children, aside, className }: { children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-screen flex-wrap bg-bg text-text-primary", className)}>
      <div className="flex flex-1 basis-[480px] flex-col items-center justify-center px-8 py-12">
        <div className="flex w-full max-w-[400px] flex-col gap-5">{children}</div>
      </div>
      {aside && <aside className="hidden flex-1 basis-[480px] flex-col justify-center gap-6 border-l border-border-subtle bg-surface-1 p-16 lg:flex">{aside}</aside>}
    </div>
  );
}

/* ---------- Settings: left sub-navigation + content ---------- */
export interface SettingsSection { key: string; label: string; href: string }

export interface SettingsLayoutProps {
  sections: SettingsSection[];
  active: string;
  /** Render links with your router: (href, props) => <Link to={href} {...props} />. Default: plain <a>. */
  renderLink?: SidebarProps["renderLink"];
  children: React.ReactNode;
  className?: string;
}

export function SettingsLayout({ sections, active, renderLink, children, className }: SettingsLayoutProps) {
  const link = renderLink ?? ((href, props) => <a href={href} {...props} />);
  return (
    <div className={cn("flex flex-wrap gap-8", className)}>
      <nav aria-label="Settings sections" className="flex w-[220px] shrink-0 flex-col gap-1">
        {sections.map((s) => (
          <React.Fragment key={s.key}>
            {link(s.href, {
              "aria-current": s.key === active ? "page" : undefined,
              className: cn("rounded-control px-3 py-2.5 no-underline", s.key === active ? "bg-surface-3 text-text-primary" : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"),
              children: s.label,
            })}
          </React.Fragment>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 basis-[560px] flex-col gap-6">{children}</div>
    </div>
  );
}

/* ---------- Three-pane messaging (Inbox, Chat) ---------- */
export function ThreePaneLayout({ list, thread, context, className }: { list: React.ReactNode; thread: React.ReactNode; context?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("-m-4 flex min-h-[calc(100vh-64px)] flex-wrap md:-m-8", className)}>
      <section aria-label="Conversations" className="flex w-full shrink-0 flex-col border-r border-border-subtle md:w-80">{list}</section>
      <section aria-label="Thread" className="flex min-w-0 flex-1 basis-[400px] flex-col">{thread}</section>
      {context && <aside aria-label="Context" className="flex w-full shrink-0 flex-col border-l border-border-subtle md:w-80">{context}</aside>}
    </div>
  );
}
