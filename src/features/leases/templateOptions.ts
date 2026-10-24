/** The lease wizard's Template select options. */
import type { LeaseTemplateRef } from "@/types/lease";
import type { LeaseTemplateListItem } from "@/types/leaseTemplate";

export interface TemplateOption {
  value: string;
  label: string;
  /** The template's defaultTermMonths (end-date prefill), null when none or unknown. */
  months: number | null;
}

/**
 * Options from GET /lease-templates (active only) plus templates created in this wizard (`extra`, until the list refetches).
 * The lease's own template (`current`, edit) shows its pinned version, and "latest is vN" when the template has a newer one.
 * When it isn't in the list (archived) it is added on top as "(archived)", so the select still shows it.
 */
export function templateOptions(list: LeaseTemplateListItem[], current: LeaseTemplateRef | null, extra: LeaseTemplateListItem[] = []): TemplateOption[] {
  const all = [...list, ...extra.filter((e) => !list.some((t) => t.id === e.id))];
  const options = all.map<TemplateOption>((t) => {
    if (current && t.id === current.id) {
      const newer = t.currentVersion > current.version ? ` (this lease's version; latest is v${t.currentVersion})` : "";
      return { value: t.id, label: `${t.name} · v${current.version}${newer}`, months: t.defaultTermMonths };
    }
    return { value: t.id, label: `${t.name}${t.isDefault ? " (default)" : ""}`, months: t.defaultTermMonths };
  });
  if (current && !all.some((t) => t.id === current.id)) {
    options.unshift({ value: current.id, label: `${current.name} · v${current.version}${current.archived ? " (archived)" : ""}`, months: null });
  }
  return options;
}
