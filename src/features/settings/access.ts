import { plural } from "@/lib/labels";
import type { PermissionCatalogItem } from "@/types/auth";
import type { ManagerListItem } from "@/types/manager";
import type { Property } from "@/types/property";

/** Catalog items grouped by `group`, groups and items in the order the API returns them. */
export function groupCatalog(catalog: PermissionCatalogItem[]): { group: string; items: PermissionCatalogItem[] }[] {
  const groups: { group: string; items: PermissionCatalogItem[] }[] = [];
  for (const item of catalog) {
    const found = groups.find((g) => g.group === item.group);
    if (found) found.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
}

/** The keys a new manager gets ("Reset to defaults"). */
export function defaultKeys(catalog: PermissionCatalogItem[]): Set<string> {
  return new Set(catalog.filter((c) => c.default).map((c) => c.key));
}

/** True when both sets hold the same values. */
export function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((v) => b.has(v));
}

/** Names of the properties a manager is assigned to, A→Z, read from the managers embedded in GET /properties. */
export function managerPropertyNames(managerId: string, properties: Property[]): string[] {
  return properties
    .filter((p) => p.managers.some((m) => m.id === managerId))
    .map((p) => p.name)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Scope column text: "No properties", up to 2 names, or "N properties". Without the property list it falls back
 * to the manager's assignedPropertyCount.
 */
export function scopeText(manager: ManagerListItem, properties: Property[] | undefined): string {
  if (!properties) return manager.assignedPropertyCount === 0 ? "No properties" : plural(manager.assignedPropertyCount, "property", "properties");
  const names = managerPropertyNames(manager.id, properties);
  if (names.length === 0) return "No properties";
  if (names.length <= 2) return names.join(", ");
  return plural(names.length, "property", "properties");
}
