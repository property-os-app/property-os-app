import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/api";
import { useTemplatePreviewPdf } from "@/features/lease-templates/hooks";

/** What to render: an unsaved body (POST /lease-templates/preview) or a saved version (GET /lease-templates/:id/preview). */
export type PreviewSource = { body: string } | { id: string; version?: number };

/** The editor's PDF preview state. */
export interface PdfPreview {
  /** Object URL of the last loaded PDF, or null. */
  url: string | null;
  /** The key `load` was last called with successfully (to tell whether the preview is out of date). */
  loadedKey: string | null;
  loading: boolean;
  error: string | null;
  /** Loads the PDF; `key` identifies what was rendered (e.g. the body text). */
  load: (source: PreviewSource, key: string) => void;
}

/**
 * Holds one PDF preview as an object URL. Loads only when `load` is called (opening the Preview tab, "Refresh preview"),
 * never on typing. Frees the previous object URL when a new one loads, and the last one when the component unmounts
 * (the editor closes). A load that finishes after a newer one started is dropped.
 */
export function usePdfPreview(): PdfPreview {
  const { mutateAsync } = useTemplatePreviewPdf();
  const [url, setUrl] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  useEffect(
    () => () => {
      requestRef.current += 1;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    },
    [],
  );

  const load = useCallback(
    (source: PreviewSource, key: string) => {
      const request = ++requestRef.current;
      setLoading(true);
      setError(null);
      mutateAsync(source)
        .then(({ blob }) => {
          if (request !== requestRef.current) return;
          const next = URL.createObjectURL(blob);
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = next;
          setUrl(next);
          setLoadedKey(key);
        })
        .catch((err: unknown) => {
          if (request === requestRef.current) setError(errorText(err));
        })
        .finally(() => {
          if (request === requestRef.current) setLoading(false);
        });
    },
    [mutateAsync],
  );

  return { url, loadedKey, loading, error, load };
}
