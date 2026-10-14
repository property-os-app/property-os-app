import { useRouteError } from "react-router";
import { Button } from "@/components/atoms";
import { InlineError } from "@/components/molecules";
import { cn } from "@/lib/cn";

/** Messages browsers use when a lazy page's file can't be downloaded (offline, or removed by a new deploy). */
const CHUNK_ERRORS = [
  "Failed to fetch dynamically imported module", // Chrome, Edge
  "Importing a module script failed", // Safari
  "error loading dynamically imported module", // Firefox
  "Unable to preload CSS", // Vite
];

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return CHUNK_ERRORS.some((text) => message.includes(text));
}

/**
 * Router errorElement: friendly message and a Reload button. `fullPage` when it renders outside the app shell.
 * A page file that failed to download gets its own message (usually the app was updated since this tab opened).
 */
export function RouteErrorPage({ fullPage = false }: { fullPage?: boolean }) {
  const chunk = isChunkLoadError(useRouteError());
  return (
    <div className={cn("flex justify-center", fullPage ? "min-h-screen items-center bg-bg p-6" : "py-16")}>
      <div className="flex w-full max-w-[520px] flex-col gap-4">
        {chunk ? (
          <InlineError
            title="This page couldn't load"
            description="The app may have been updated, or the connection dropped. Reload to get the latest version."
          />
        ) : (
          <InlineError title="Something went wrong" description="This page hit an unexpected error. Reload to try again." />
        )}
        <Button variant="primary" className="self-start" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
}
