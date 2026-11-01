import { Small } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { useServerWaking } from "@/lib/serverWake";

/** "Waking up the server…" while a request waits on a sleeping API server (lib/serverWake.ts); renders nothing otherwise. */
export function WakingNotice({ className }: { className?: string }) {
  const waking = useServerWaking();
  return (
    <div role="status" aria-live="polite" className={cn(!waking && "sr-only", className)}>
      {waking && <Small className="block">Waking up the server… this can take up to a minute.</Small>}
    </div>
  );
}
