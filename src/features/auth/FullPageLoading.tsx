import { Skeleton } from "@/components/atoms";
import { WakingNotice } from "@/features/shared/WakingNotice";

/**
 * Centered skeleton while Firebase restores the session or GET /auth/me loads (also right after Sign in). Avoids a flash of
 * the login page. "Waking up the server…" under it when the server is slow to answer.
 */
export function FullPageLoading() {
  return (
    <div role="status" aria-busy="true" className="flex min-h-screen items-center justify-center bg-bg px-8">
      <span className="sr-only">Loading</span>
      <div className="flex w-full max-w-[400px] flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <WakingNotice className="mt-2 text-center" />
      </div>
    </div>
  );
}
