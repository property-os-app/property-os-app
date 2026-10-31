import type { ReactNode } from "react";
import { Link } from "react-router";
import { PageHeader, type SidebarProps } from "@/components/organisms";
import { SettingsLayout, type SettingsSection } from "@/components/templates";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";

export type SettingsTab = "general" | "users" | "billing" | "templates";

const general: SettingsSection = { key: "general", label: "General", href: "/settings" };
const users: SettingsSection = { key: "users", label: "Users and Permissions", href: "/settings/users" };
const billing: SettingsSection = { key: "billing", label: "Billing", href: "/settings/billing" };
const templates: SettingsSection = { key: "templates", label: "Lease templates", href: "/settings/templates" };

const renderLink: SidebarProps["renderLink"] = (href, props) => <Link to={href} {...props} />;

/** The Settings page header and left nav. "Users and Permissions" and "Billing" only for the owner; "Lease templates" for everyone here (Owner and managers). */
export function SettingsFrame({ active, children }: { active: SettingsTab; children: ReactNode }) {
  const { me } = useAuth();
  const canManage = can(me!, "access.manage");
  return (
    <>
      <PageHeader title="Settings" description={canManage ? "Your preferences, your team's access, rent billing and your lease templates." : "Your preferences and the lease templates."} />
      <SettingsLayout sections={canManage ? [general, users, billing, templates] : [general, templates]} active={active} renderLink={renderLink}>
        {children}
      </SettingsLayout>
    </>
  );
}
