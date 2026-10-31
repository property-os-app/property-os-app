import { useState } from "react";
import { Braces } from "lucide-react";
import { Button, Caption, Overline, Skeleton } from "@/components/atoms";
import { EmptyState, InlineError, SearchInput } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { errorText } from "@/lib/api";
import { useMergeFields } from "@/features/lease-templates/hooks";
import { groupMergeFields, mergeToken } from "@/features/lease-templates/markdown";
import { linkFocus } from "@/features/shared/linkClass";
import type { MergeField } from "@/types/leaseTemplate";

/**
 * "Insert field": the merge field catalog (GET /lease-templates/merge-fields) grouped by group, with a search box. Each row
 * shows the label, the {{key}} and the sample value. Picking one calls `onPick` and closes. Opens over the editor Drawer
 * (a Modal may open over a drawer). Mount only while open.
 */
export function InsertFieldModal({ onPick, onClose }: { onPick: (field: MergeField) => void; onClose: () => void }) {
  const fields = useMergeFields();
  const [query, setQuery] = useState("");
  const groups = groupMergeFields(fields.data ?? [], query);

  let content;
  if (fields.isPending) {
    content = (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading fields">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  } else if (fields.isError) {
    content = <InlineError title="Couldn't load the fields" description={errorText(fields.error)} onRetry={() => void fields.refetch()} />;
  } else if (groups.length === 0) {
    content = (
      <EmptyState
        icon={<Braces strokeWidth={1.5} />}
        title={query ? "No fields match" : "No fields"}
        description={query ? "Try another word, like rent or name." : "The server returned no merge fields."}
        action={query ? <Button onClick={() => setQuery("")}>Clear search</Button> : undefined}
      />
    );
  } else {
    content = (
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <section key={g.group} aria-label={g.group} className="flex flex-col gap-1">
            <Overline className="px-2 uppercase">{g.group}</Overline>
            <ul className="m-0 flex list-none flex-col p-0">
              {g.fields.map((f) => (
                <li key={f.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(f);
                      onClose();
                    }}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-2 py-2 text-left hover:bg-surface-3",
                      linkFocus,
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-text-primary">{f.label}</span>
                      <Caption className="block truncate font-mono">{mergeToken(f.key)}</Caption>
                    </span>
                    <Caption className="max-w-[45%] shrink-0 truncate text-right" title={f.sample}>
                      {f.sample}
                    </Caption>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} title="Insert field" description="Filled in from each lease when its PDF is made. Right: the sample value.">
      <SearchInput placeholder="Search fields" aria-label="Search fields" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      <div className="min-h-0 md:max-h-[60vh] md:overflow-y-auto">{content}</div>
    </Modal>
  );
}
