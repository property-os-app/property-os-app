import { useCallback, useMemo, useState } from "react";
import { Navigate } from "react-router";
import { Users } from "lucide-react";
import { Badge, Button, H2, Small } from "@/components/atoms";
import { Card, EmptyState, SearchInput } from "@/components/molecules";
import { Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { plural } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useManagers, useProperties } from "@/features/properties/hooks";
import { scopeText } from "@/features/settings/access";
import { EditAccessDrawer } from "@/features/settings/EditAccessDrawer";
import { MembersTable, type MemberRow } from "@/features/settings/MembersTable";
import { SettingsFrame } from "@/features/settings/SettingsFrame";
import type { ManagerListItem } from "@/types/manager";

/** /settings/users: Users and Permissions (owner only; anyone else goes to General). The owner plus every manager, searchable. */
export function UsersPage() {
  const { me } = useAuth();
  const user = me!;
  if (!can(user, "access.manage")) return <Navigate to="/settings" replace />;
  return <UsersContent />;
}

function UsersContent() {
  const { me } = useAuth();
  const owner = me!;
  const managers = useManagers();
  const properties = useProperties();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ManagerListItem | null>(null);
  const onEditAccess = useCallback((m: ManagerListItem) => setEditing(m), []);

  const allRows = useMemo<MemberRow[]>(() => {
    const ownerRow: MemberRow = { id: owner.id, name: owner.name, email: owner.email, role: owner.role, scope: "All properties" };
    const managerRows = (managers.data ?? []).map<MemberRow>((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: "PROPERTY_MANAGER",
      scope: scopeText(m, properties.data),
      manager: m,
    }));
    return [ownerRow, ...managerRows];
  }, [owner, managers.data, properties.data]);

  const query = search.trim().toLowerCase();
  const rows = query ? allRows.filter((r) => r.name.toLowerCase().includes(query) || r.email.toLowerCase().includes(query)) : allRows;
  const state = managers.isPending ? "loading" : managers.isError ? "error" : rows.length === 0 ? "empty" : "ideal";
  const noManagers = managers.isSuccess && managers.data.length === 0 && !query;

  return (
    <SettingsFrame active="users">
      <div className="flex flex-col gap-1">
        <H2>Users and Permissions</H2>
        <Small>Choose which properties each manager sees and what they may do there.</Small>
      </div>

      <Toolbar className="flex-nowrap">
        <div className="min-w-0 flex-1 md:max-w-80">
          <SearchInput placeholder="Search members" aria-label="Search members" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {managers.isSuccess && (
          <Badge tone="neutral" dot={false} className="shrink-0">
            {plural(allRows.length, "member")}
          </Badge>
        )}
      </Toolbar>

      <MembersTable
        rows={rows}
        state={state}
        empty={{ title: "No members match", description: "Try another name or email.", action: <Button onClick={() => setSearch("")}>Clear search</Button> }}
        error={{ title: "Couldn't load members", description: managers.isError ? errorText(managers.error) : undefined, onRetry: () => void managers.refetch() }}
        onEditAccess={onEditAccess}
      />

      {noManagers && (
        <Card padding="none">
          <EmptyState icon={<Users strokeWidth={1.5} />} title="No managers yet" description="Manager accounts are created by the developer for now." />
        </Card>
      )}

      {editing && <EditAccessDrawer manager={editing} onClose={() => setEditing(null)} />}
    </SettingsFrame>
  );
}
