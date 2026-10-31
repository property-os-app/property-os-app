import type { ReactNode } from "react";
import { Avatar, Dash, Divider, Overline, Skeleton, Small } from "@/components/atoms";
import { Card } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { ContactLink } from "@/features/shared/ContactLink";
import { RatingText } from "@/features/shared/Rating";
import { InactiveBadge, InsuranceBadge, VendorMenu, type VendorActions } from "@/features/vendors/VendorParts";
import { rateText, tradeLine } from "@/features/vendors/vendorText";
import type { Vendor } from "@/types/vendor";

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      <Overline>{label}</Overline>
      {children}
    </div>
  );
}

export interface VendorCardProps {
  vendor: Vendor;
  tradeLabel: string;
  onOpen: (v: Vendor) => void;
  actions?: VendorActions;
}

/**
 * Cards view card (3 per row from xl): avatar, name, "Trade · area", rate, kebab; contact name, phone and email (ContactLink);
 * License and the insurance badge; rating, jobs (resolved tickets) and active tickets. Opens the vendor drawer; the kebab and contact links don't. Archived vendors are muted.
 */
export function VendorCard({ vendor, tradeLabel, onOpen, actions }: VendorCardProps) {
  const rate = rateText(vendor);
  return (
    <Card
      padding="compact"
      role="button"
      tabIndex={0}
      aria-label={`Open ${vendor.name}`}
      onClick={() => onOpen(vendor)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(vendor);
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col gap-3 transition-colors duration-fast hover:border-border-strong focus-visible:focus-ring",
        vendor.archivedAt && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={vendor.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-bold text-text-primary">{vendor.name}</span>
            <InactiveBadge vendor={vendor} />
          </div>
          <Small className="block truncate">{tradeLine(tradeLabel, vendor)}</Small>
          <Small className="block font-semibold tabular text-text-primary">{rate ?? <Dash />}</Small>
        </div>
        <VendorMenu vendor={vendor} actions={actions} />
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        {vendor.contactName && <Small className="block truncate text-text-primary">{vendor.contactName}</Small>}
        <Small className="block truncate">
          <ContactLink kind="phone" value={vendor.phone} />
        </Small>
        <Small className="block truncate">
          <ContactLink kind="email" value={vendor.email} />
        </Small>
      </div>

      <Divider />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="License">
          <Small className="max-w-full truncate text-text-primary">{vendor.licenseNumber ?? <Dash />}</Small>
        </Stat>
        <Stat label="Insurance">
          <InsuranceBadge vendor={vendor} />
        </Stat>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Rating">
          <Small className="max-w-full">
            <RatingText rating={vendor.rating} count={vendor.ratingCount} compact />
          </Small>
        </Stat>
        <Stat label="Jobs">
          <Small className="font-semibold tabular text-text-primary">{vendor.jobsCount}</Small>
        </Stat>
        <Stat label="Active">
          <Small className="font-semibold tabular text-text-primary">{vendor.activeTickets}</Small>
        </Stat>
      </div>
    </Card>
  );
}

/** Loading placeholder in the shape of a VendorCard. */
export function VendorCardSkeleton() {
  return (
    <Card padding="compact" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="h-3.5 w-48" />
      <Skeleton className="h-px" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    </Card>
  );
}
