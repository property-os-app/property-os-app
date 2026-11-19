import { useSearchParams } from "react-router";
import { RentRollMonthView } from "@/features/rent-roll/RentRollMonthView";
import { RentRollYearView } from "@/features/rent-roll/RentRollYearView";

/** /rent-roll: the Month view (default, ?month=) or the Year view (?view=year&year=). Each view owns its own hooks and header. */
export function RentRollPage() {
  const [params] = useSearchParams();
  return params.get("view") === "year" ? <RentRollYearView /> : <RentRollMonthView />;
}
