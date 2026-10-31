import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/atoms";
import { KebabMenu, StatusBadge, type MenuItem } from "@/components/molecules";
import { maybeDeletable } from "@/features/vendors/vendorStats";
import { insuranceText } from "@/features/vendors/vendorText";
import type { Vendor } from "@/types/vendor";

/** Row actions for a vendor card, table row or drawer. Omit the object when the user can't manage vendors (vendors.manage). */
export interface VendorActions {
  onEdit: (v: Vendor) => void;
  onArchive: (v: Vendor) => void;
  onUnarchive: (v: Vendor) => void;
  onDelete: (v: Vendor) => void;
}

/** The insurance badge: color from the backend's insuranceStatus, text "Expired Sep 15" / "Expires Oct 29" / "Valid to Mar 2027" / "No insurance on file". */
export function InsuranceBadge({ vendor }: { vendor: Vendor }) {
  return (
    <StatusBadge domain="insurance" status={vendor.insuranceStatus}>
      {insuranceText(vendor)}
    </StatusBadge>
  );
}

/** "Inactive" for an archived vendor, nothing otherwise. */
export function InactiveBadge({ vendor }: { vendor: Vendor }) {
  return vendor.archivedAt ? <Badge tone="neutral">Inactive</Badge> : null;
}

/** The "⋮" menu: Edit, Archive or Unarchive, and Delete only while `maybeDeletable`. Nothing without `actions`. */
export function VendorMenu({ vendor, actions }: { vendor: Vendor; actions?: VendorActions }) {
  if (!actions) return null;
  const items: MenuItem[] = [{ label: "Edit", icon: <Pencil strokeWidth={1.5} />, onSelect: () => actions.onEdit(vendor) }];
  if (vendor.archivedAt) items.push({ label: "Unarchive", icon: <ArchiveRestore strokeWidth={1.5} />, onSelect: () => actions.onUnarchive(vendor) });
  else items.push({ label: "Archive", icon: <Archive strokeWidth={1.5} />, onSelect: () => actions.onArchive(vendor) });
  if (maybeDeletable(vendor)) items.push({ label: "Delete", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => actions.onDelete(vendor) });
  return <KebabMenu label={`Actions for ${vendor.name}`} items={items} />;
}
