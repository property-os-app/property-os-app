import { useState } from "react";
import { Avatar, Button, Caption, Skeleton, Tag } from "@/components/atoms";
import { Card, InlineError, SearchInput } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { useTenants } from "@/features/tenants/hooks";

/** What the picker needs to show a chosen tenant. */
export interface PickedTenant {
  id: string;
  fullName: string;
  email: string;
}

const MAX_RESULTS = 5;

/** SearchInput over GET /tenants (name, email, phone; client-side) and a short list of matches. */
function TenantSearch({ id, exclude, onPick, autoFocus }: { id: string; exclude: string[]; onPick: (t: PickedTenant) => void; autoFocus?: boolean }) {
  const tenants = useTenants();
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const results = term
    ? (tenants.data ?? [])
        .filter((t) => !exclude.includes(t.id))
        .filter((t) => [t.fullName, t.email, t.phone].some((v) => v.toLowerCase().includes(term)))
        .slice(0, MAX_RESULTS)
    : [];

  return (
    <div className="flex flex-col gap-2">
      <SearchInput
        id={id}
        containerClassName="max-w-none"
        placeholder="Search name, email or phone"
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {term &&
        (tenants.isPending ? (
          <Skeleton className="h-12" />
        ) : tenants.isError ? (
          <InlineError title="Couldn't load tenants" description={errorText(tenants.error)} onRetry={() => void tenants.refetch()} />
        ) : results.length === 0 ? (
          <Caption>No tenants match "{query.trim()}".</Caption>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <ul className="m-0 list-none divide-y divide-border-subtle p-0">
              {results.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick({ id: t.id, fullName: t.fullName, email: t.email });
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-3 focus-visible:focus-ring"
                  >
                    <Avatar name={t.fullName} size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-text-primary">{t.fullName}</span>
                      <Caption className="block truncate">{[t.email, t.phone].join(" · ")}</Caption>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
    </div>
  );
}

export interface TenantPickerProps {
  id: string;
  /** Chosen tenant id, or "". */
  value: string;
  onChange: (tenant: PickedTenant | null) => void;
  /** Names for ids (from GET /tenants, the lease and tenants added in the wizard). */
  lookup: (id: string) => PickedTenant | undefined;
  /** Ids that can't be picked (the co-tenants are allowed: the wizard moves them). */
  exclude?: string[];
}

/** Primary tenant: search + results, or the chosen tenant as a compact card with "Change". */
export function TenantPicker({ id, value, onChange, lookup, exclude = [] }: TenantPickerProps) {
  const [changing, setChanging] = useState(false);
  const chosen = value ? lookup(value) : undefined;

  if (value && !changing) {
    return (
      <Card padding="compact" className="flex items-center gap-3">
        <Avatar name={chosen?.fullName ?? "?"} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-text-primary">{chosen?.fullName ?? "Loading..."}</div>
          <Caption className="block truncate">{chosen?.email}</Caption>
        </div>
        <Button size="sm" onClick={() => setChanging(true)}>
          Change
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <TenantSearch
        id={id}
        exclude={[...exclude, value].filter(Boolean)}
        autoFocus={changing}
        onPick={(t) => {
          onChange(t);
          setChanging(false);
        }}
      />
      {changing && (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setChanging(false)}>
            Keep {chosen?.fullName ?? "the current tenant"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onChange(null);
              setChanging(false);
            }}
          >
            Remove primary tenant
          </Button>
        </div>
      )}
    </div>
  );
}

export interface CoTenantPickerProps {
  id: string;
  value: string[];
  onChange: (ids: string[]) => void;
  lookup: (id: string) => PickedTenant | undefined;
  /** The primary tenant: never a co-tenant. */
  primaryId: string;
}

/** Co-tenants: chosen ones as removable Tags, then the same search. */
export function CoTenantPicker({ id, value, onChange, lookup, primaryId }: CoTenantPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tid) => (
            <Tag key={tid} onRemove={() => onChange(value.filter((v) => v !== tid))}>
              {lookup(tid)?.fullName ?? "Loading..."}
            </Tag>
          ))}
        </div>
      )}
      <TenantSearch id={id} exclude={[...value, primaryId].filter(Boolean)} onPick={(t) => onChange([...value, t.id])} />
    </div>
  );
}
