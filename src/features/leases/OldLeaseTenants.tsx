import { useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import { Avatar, Badge, Button, Caption, Input, Radio } from "@/components/atoms";
import { Combobox, FormField, InlineError } from "@/components/molecules";
import { errorText } from "@/lib/api";
import {
  addExistingTenant,
  addNewTenant,
  MAX_OLD_LEASE_TENANTS,
  removeTenant,
  swapForExisting,
  type NewTenantErrors,
  type NewTenantRow,
  type OldLeaseErrors,
  type OldLeaseTenant,
  type OldLeaseValues,
} from "@/features/leases/oldLeaseForm";
import { useTenants } from "@/features/tenants/hooks";
import type { TenantListItem } from "@/types/tenant";

type TenantPart = Pick<OldLeaseValues, "tenants" | "primaryKey">;

export interface OldLeaseTenantsProps {
  value: TenantPart;
  /** New rows, or another primary. `clearRow`: the new tenant's row whose errors no longer apply. */
  onChange: (next: TenantPart, clearRow?: string) => void;
  errors: Pick<OldLeaseErrors, "tenants" | "newTenants">;
  /** tenants.create_edit: shows "Add new tenant". */
  canAddNew: boolean;
  disabled?: boolean;
}

const contactOf = (t: Pick<TenantListItem, "email" | "phone">) => [t.email, t.phone].filter(Boolean).join(" · ");

/**
 * Add old lease: the tenants section. Existing tenants come from the searchable picker, new ones are typed in place and
 * created with the lease. Exactly one Primary (a single tenant is ticked by itself). Up to 10 in all.
 */
export function OldLeaseTenants({ value, onChange, errors, canAddNew, disabled }: OldLeaseTenantsProps) {
  const tenants = useTenants();
  const nextNew = useRef(1);
  // The new row added last: its name takes the focus.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const full = value.tenants.length >= MAX_OLD_LEASE_TENANTS;
  const listed = new Set(value.tenants.flatMap((t) => (t.kind === "existing" ? [t.id] : [])));
  const options = (tenants.data ?? []).filter((t) => !listed.has(t.id)).map((t) => ({ value: t.id, label: t.fullName, description: contactOf(t) || undefined }));

  const patchNew = (row: NewTenantRow, over: Partial<NewTenantRow>) =>
    onChange({ ...value, tenants: value.tenants.map((t) => (t.key === row.key ? { ...row, ...over } : t)) }, row.key);

  const addExisting = (id: string) => {
    const t = tenants.data?.find((x) => x.id === id);
    if (t) onChange(addExistingTenant(value, { id: t.id, fullName: t.fullName, email: t.email, phone: t.phone }));
  };

  const addNew = () => {
    const n = nextNew.current++;
    setFocusKey(`new-${n}`);
    onChange(addNewTenant(value, n));
  };

  const swapFor = (row: OldLeaseTenant, existing: { id: string; fullName: string }) => {
    // The picker's list may not have the tenant yet (added just now by someone else): the 409 has the name.
    const t = tenants.data?.find((x) => x.id === existing.id);
    onChange(swapForExisting(value, row.key, { id: existing.id, fullName: t?.fullName ?? existing.fullName, email: t?.email ?? null, phone: t?.phone ?? null }), row.key);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span id="ol-tenants-label" className="text-small text-text-secondary">
          Tenants<span className="text-danger"> *</span>
        </span>
        <Caption className="tabular">
          {value.tenants.length} of {MAX_OLD_LEASE_TENANTS}
        </Caption>
      </div>

      {value.tenants.length > 0 && (
        <ul role="radiogroup" aria-labelledby="ol-tenants-label" className="m-0 flex list-none flex-col gap-2 p-0">
          {value.tenants.map((row, i) => {
            const name = row.fullName.trim() || `new tenant ${i + 1}`;
            const primary = (
              <Radio
                name="ol-primary"
                label="Primary"
                aria-label={`Primary tenant: ${name}`}
                checked={value.primaryKey === row.key}
                disabled={disabled}
                onChange={() => onChange({ ...value, primaryKey: row.key })}
                className="shrink-0 text-small max-md:min-h-11"
              />
            );
            const remove = (
              <Button
                size="sm"
                variant="ghost"
                iconOnly
                aria-label={`Remove ${name}`}
                disabled={disabled}
                onClick={() => onChange(removeTenant(value, row.key), row.key)}
                className="max-md:size-11"
              >
                <X size={16} strokeWidth={1.5} />
              </Button>
            );
            return (
              <li key={row.key} className="rounded-control border border-border-subtle bg-surface-2 p-3">
                {row.kind === "existing" ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="shrink-0">
                      <Avatar name={row.fullName} size={32} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-text-primary">{row.fullName}</div>
                      {contactOf(row) && <Caption className="block truncate">{contactOf(row)}</Caption>}
                    </div>
                    <div className="flex items-center gap-2 max-md:basis-full max-md:justify-between">
                      {primary}
                      {remove}
                    </div>
                  </div>
                ) : (
                  <NewTenant
                    row={row}
                    errors={errors.newTenants?.[row.key] ?? {}}
                    primary={primary}
                    remove={remove}
                    autoFocus={focusKey === row.key}
                    disabled={disabled}
                    onPatch={(over) => patchNew(row, over)}
                    onUseExisting={(existing) => swapFor(row, existing)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {errors.tenants && (
        <div role="alert" className="flex items-center gap-1.5 text-small text-danger">
          <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0" />
          {errors.tenants}
        </div>
      )}

      {full ? (
        <Caption>A lease can have at most {MAX_OLD_LEASE_TENANTS} tenants.</Caption>
      ) : (
        <div className="flex flex-col gap-2 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            {tenants.isError ? (
              <InlineError title="Couldn't load the tenants" description={errorText(tenants.error)} onRetry={() => void tenants.refetch()} />
            ) : (
              <Combobox
                id="ol-tenant"
                options={options}
                value=""
                onChange={(id) => id && addExisting(id)}
                listLabel="Existing tenants"
                placeholder={tenants.isPending ? "Loading tenants..." : "Add an existing tenant"}
                noMatchesText="No tenants match"
                disabled={disabled || tenants.isPending}
                invalid={Boolean(errors.tenants) && value.tenants.length === 0}
              />
            )}
          </div>
          {canAddNew && (
            <Button icon={<Plus size={16} strokeWidth={1.5} />} disabled={disabled} onClick={addNew} className="shrink-0 max-md:h-11">
              Add new tenant
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface NewTenantProps {
  row: NewTenantRow;
  errors: NewTenantErrors;
  primary: ReactNode;
  remove: ReactNode;
  autoFocus: boolean;
  disabled?: boolean;
  onPatch: (over: Partial<NewTenantRow>) => void;
  onUseExisting: (tenant: { id: string; fullName: string }) => void;
}

/** A new tenant typed in place: name (required), email, phone. An email someone has already offers that tenant instead. */
function NewTenant({ row, errors, primary, remove, autoFocus, disabled, onPatch, onUseExisting }: NewTenantProps) {
  const id = `ol-${row.key}`;
  const { existing } = errors;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Badge tone="info" dot={false}>
          New tenant
        </Badge>
        <div className="flex items-center gap-2">
          {primary}
          {remove}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField label="Full name" htmlFor={`${id}-name`} required error={errors.fullName} className="md:col-span-2">
          <Input id={`${id}-name`} autoFocus={autoFocus} autoComplete="off" value={row.fullName} disabled={disabled} onChange={(e) => onPatch({ fullName: e.target.value })} />
        </FormField>
        <div className="flex min-w-0 flex-col gap-2">
          <FormField label="Email" htmlFor={`${id}-email`} help="Optional" error={errors.email}>
            <Input id={`${id}-email`} type="email" autoComplete="off" value={row.email} disabled={disabled} onChange={(e) => onPatch({ email: e.target.value })} />
          </FormField>
          {existing && (
            <Button size="sm" disabled={disabled} onClick={() => onUseExisting(existing)} className="self-start max-md:h-11">
              Use existing tenant
            </Button>
          )}
        </div>
        <FormField label="Phone" htmlFor={`${id}-phone`} help="Optional" error={errors.phone}>
          <Input id={`${id}-phone`} type="tel" autoComplete="off" value={row.phone} disabled={disabled} onChange={(e) => onPatch({ phone: e.target.value })} />
        </FormField>
      </div>
    </div>
  );
}
