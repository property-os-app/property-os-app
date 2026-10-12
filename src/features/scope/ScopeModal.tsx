import { Check } from "lucide-react";
import { Skeleton, Small } from "@/components/atoms";
import { InlineError } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Property } from "@/types/property";

interface ScopeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  value: string | null;
  onSelect: (propertyId: string | null) => void;
}

/** "Choose property" modal: "All properties" plus one row per property, the current one marked. */
export function ScopeModal({ open, onOpenChange, properties, isPending, error, onRetry, value, onSelect }: ScopeModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Choose property">
      <div className="flex flex-col gap-1">
        <ScopeRow title="All properties" subtitle="Every property you can see" selected={value === null} onClick={() => onSelect(null)} />
        {isPending ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : error ? (
          <InlineError className="mt-2" title="Couldn't load properties" description={errorText(error)} onRetry={onRetry} />
        ) : properties && properties.length > 0 ? (
          properties.map((p) => (
            <ScopeRow key={p.id} title={p.name} subtitle={`${p.city}, ${p.state}`} selected={value === p.id} onClick={() => onSelect(p.id)} />
          ))
        ) : (
          <Small className="px-3 py-2">No properties yet.</Small>
        )}
      </div>
    </Modal>
  );
}

function ScopeRow({ title, subtitle, selected, onClick }: { title: string; subtitle: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left transition-colors duration-fast hover:bg-surface-3 focus-visible:focus-ring",
        selected && "bg-surface-3",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{title}</span>
        <Small className="block truncate">{subtitle}</Small>
      </span>
      {selected && <Check aria-label="Current" size={16} strokeWidth={1.5} className="shrink-0 text-success" />}
    </button>
  );
}
