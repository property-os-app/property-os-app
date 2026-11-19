import { useSearchParams } from "react-router";
import { SegmentedControl } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { useIsMobile } from "@/lib/useIsMobile";
import { viewSwitchParams, type RentRollView } from "@/features/rent-roll/yearStats";

/**
 * Month | Year switch in the Rent Roll header. `period` is the current view's month ("YYYY-MM") or year ("YYYY"):
 * the other view opens on the matching period (see viewSwitchParams). Keeps the search and the scroll position.
 */
export function RentRollViewSwitch({ view, period }: { view: RentRollView; period: string }) {
  const [, setParams] = useSearchParams();
  const isMobile = useIsMobile();
  return (
    <SegmentedControl<RentRollView>
      aria-label="Rent roll view"
      value={view}
      onChange={(next) => {
        if (next !== view) setParams((prev) => viewSwitchParams(prev, next, period), { preventScrollReset: true });
      }}
      segments={[
        { value: "month", label: "Month" },
        { value: "year", label: "Year" },
      ]}
      className={cn(isMobile && "w-full [&>button]:h-9 [&>button]:flex-1 [&>button]:justify-center")}
    />
  );
}
