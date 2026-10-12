import { Button } from "@/components/atoms";
import { InlineError } from "@/components/molecules";
import { cn } from "@/lib/cn";

/** Router errorElement: friendly message and a Reload button. `fullPage` when it renders outside the app shell. */
export function RouteErrorPage({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div className={cn("flex justify-center", fullPage ? "min-h-screen items-center bg-bg p-6" : "py-16")}>
      <div className="flex w-full max-w-[520px] flex-col gap-4">
        <InlineError title="Something went wrong" description="This page hit an unexpected error. Reload to try again." />
        <Button variant="primary" className="self-start" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
}
