import { toast } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { useDownloadDocument, useViewDocument } from "@/features/documents/hooks";
import { openBlankTab, POPUP_BLOCKED_MESSAGE } from "@/features/documents/view";
import type { Document } from "@/types/document";

/**
 * View (a new tab, opened in the click itself so pop-up blockers allow it) and Download, each with a fresh signed link,
 * errors as a toast. `viewingId` / `downloadingId`: the document whose link is loading.
 */
export function useDocumentActions() {
  const download = useDownloadDocument();
  const view = useViewDocument();

  const onDownload = (doc: Pick<Document, "id" | "name">) =>
    download.mutate(doc.id, { onError: (err) => toast.error(`Couldn't download ${doc.name}`, { description: errorText(err) }) });

  const onView = (doc: Pick<Document, "id" | "name">) => {
    const tab = openBlankTab();
    if (!tab) {
      toast.error(`Couldn't open ${doc.name}`, { description: POPUP_BLOCKED_MESSAGE });
      return;
    }
    view.mutate(
      { docId: doc.id, tab },
      {
        onError: (err) => {
          tab.close(); // showInTab already closes it; this also covers any other failure (closing twice is harmless).
          toast.error(`Couldn't open ${doc.name}`, { description: errorText(err) });
        },
      },
    );
  };

  return {
    onView,
    onDownload,
    viewingId: view.isPending ? view.variables?.docId : null,
    downloadingId: download.isPending ? download.variables : null,
  };
}
