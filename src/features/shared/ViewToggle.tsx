import { Columns3, LayoutGrid, List } from "lucide-react";
import { SegmentedControl } from "@/components/molecules";
import type { BoardView, ListView } from "@/features/shared/listView";

/** The Cards / Table control at the right end of a desktop list toolbar. */
export function ViewToggle({ value, onChange }: { value: ListView; onChange: (view: ListView) => void }) {
  return (
    <SegmentedControl<ListView>
      aria-label="View"
      value={value}
      onChange={onChange}
      segments={[
        { value: "cards", label: "Cards", icon: <LayoutGrid size={16} strokeWidth={1.5} /> },
        { value: "table", label: "Table", icon: <List size={16} strokeWidth={1.5} /> },
      ]}
    />
  );
}

/** The Board / Table control at the right end of the Maintenance toolbar (also shown on phones). */
export function BoardViewToggle({ value, onChange }: { value: BoardView; onChange: (view: BoardView) => void }) {
  return (
    <SegmentedControl<BoardView>
      aria-label="View"
      value={value}
      onChange={onChange}
      segments={[
        { value: "board", label: "Board", icon: <Columns3 size={16} strokeWidth={1.5} /> },
        { value: "table", label: "Table", icon: <List size={16} strokeWidth={1.5} /> },
      ]}
    />
  );
}
