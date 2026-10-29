import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Count } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Avatar } from "@/components/atoms/Avatar";
import { StatusBadge, type TicketPriority } from "@/components/molecules/StatusBadge";
import { KebabMenu } from "@/components/molecules/Menu";

export type KanbanColumnKey = "open" | "assigned" | "in_progress" | "resolved";

export interface KanbanTicket {
  id: string;
  number: string;
  title: string;
  location: string;
  priority: TicketPriority;
  assignee?: { name: string; avatarUrl?: string };
  age: string;
  /** e.g. "SLA 4h" shown in red when past SLA */
  slaNote?: string;
  pastSla?: boolean;
  column: KanbanColumnKey;
}

export interface KanbanBoardProps {
  tickets: KanbanTicket[];
  onOpen: (ticket: KanbanTicket) => void;
  /** Called by drag-and-drop and by the "Move to" menu (keyboard alternative). */
  onMove: (ticketId: string, to: KanbanColumnKey) => void;
  onAdd?: (column: KanbanColumnKey) => void;
  className?: string;
}

const columns: { key: KanbanColumnKey; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

/** Four-column Kanban with native drag-and-drop plus a "Move to" menu so cards can be moved without dragging. */
export function KanbanBoard({ tickets, onOpen, onMove, onAdd, className }: KanbanBoardProps) {
  const [overCol, setOverCol] = React.useState<KanbanColumnKey | null>(null);
  return (
    <div className={cn("grid grid-cols-2 items-start gap-4 lg:grid-cols-4", className)}>
      {columns.map((col) => {
        const items = tickets.filter((t) => t.column === col.key);
        return (
          <section
            key={col.key}
            aria-label={col.label}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
            onDragLeave={() => setOverCol(null)}
            onDrop={(e) => { e.preventDefault(); setOverCol(null); const id = e.dataTransfer.getData("text/plain"); if (id) onMove(id, col.key); }}
            className={cn("flex flex-col gap-2.5 rounded-card border bg-surface-1 p-3 transition-colors duration-fast", overCol === col.key ? "border-success" : "border-border-subtle")}
          >
            <div className="flex items-center justify-between px-1 pb-2 pt-1">
              <div className="flex items-center gap-2"><span className="text-h3">{col.label}</span><Count>{items.length}</Count></div>
              {onAdd && col.key === "open" && <Button variant="ghost" size="sm" iconOnly aria-label="Add ticket" onClick={() => onAdd(col.key)} icon={<Plus size={16} strokeWidth={1.5} />} />}
            </div>
            {items.map((t) => (
              <article
                key={t.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                onClick={() => onOpen(t)}
                className={cn(
                  "flex cursor-grab flex-col gap-2 rounded-control border bg-surface-2 p-3 hover:border-border-strong",
                  t.priority === "EMERGENCY" ? "border-danger/50" : "border-border-subtle",
                  t.column === "resolved" && "opacity-80",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-muted">{t.number}</span>
                  <StatusBadge domain="priority" status={t.priority} />
                </div>
                <div className="font-semibold text-text-primary">{t.title}</div>
                <div className="text-small text-text-secondary">{t.location}</div>
                <div className="flex items-center justify-between">
                  {t.assignee ? (
                    <Avatar name={t.assignee.name} src={t.assignee.avatarUrl} size={24} />
                  ) : (
                    <span aria-label="Unassigned" className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-border-strong text-text-muted"><Plus size={12} /></span>
                  )}
                  <span className={cn("text-caption", t.pastSla ? "text-danger" : "text-text-muted")}>{t.age}{t.slaNote ? ` · ${t.slaNote}` : ""}</span>
                  <KebabMenu
                    label={`Move ${t.number}`}
                    items={columns.filter((c) => c.key !== t.column).map((c) => ({ label: `Move to ${c.label}`, onSelect: () => onMove(t.id, c.key) }))}
                  />
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
