import type { ReactNode } from "react";
import { Link } from "react-router";
import { PageHeader, type SidebarProps } from "@/components/organisms";
import { SettingsLayout, type SettingsSection } from "@/components/templates";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";

export type SettingsTab = "general" | "users";

const general: SettingsSection = { key: "general", label: "General", href: "/settings" };
const users: SettingsSection = { key: "users", label: "Users and Permissions", href: "/settings/users" };

const renderLink: SidebarProps["renderLink"] = (href, props) => <Link to={href} {...props} />;

/** The Settings page header and left nav. "Users and Permissions" only for the owner (access.manage). */
export function SettingsFrame({ active, children }: { active: SettingsTab; children: ReactNode }) {
  const { me } = useAuth();
  const canManage = can(me!, "access.manage");
  return (
    <>
      <PageHeader title="Settings" description={canManage ? "Your preferences and your team's access." : "Your preferences. They are saved on this device."} />
      <SettingsLayout sections={canManage ? [general, users] : [general]} active={active} renderLink={renderLink}>
        {children}
      </SettingsLayout>
    </>
  );
}
