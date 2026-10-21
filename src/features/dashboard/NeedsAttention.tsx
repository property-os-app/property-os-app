import { Link } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { Button, buttonVariants, Skeleton, Small } from "@/components/atoms";
import { Card, CardHeader, EmptyState, InlineError } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Section } from "@/features/dashboard/hooks";
import type { AttentionItem } from "@/features/dashboard/stats";

/** The design's action panel without AI: one row per rule that applies (bold title, one line, a small secondary button). */
export function NeedsAttention({ attention, onGenerate }: { attention: Section<AttentionItem[]>; onGenerate: () => void }) {
  const items = attention.data;
  return (
    <Card as="section" padding="compact" aria-label="Needs attention">
      <CardHeader title="Needs attention" className="mb-3" />
      {attention.error ? (
        <InlineError title="Couldn't check what needs attention" description={errorText(attention.error)} onRetry={attention.retry} />
      ) : !items ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState className="py-6" icon={<CheckCircle2 strokeWidth={1.5} />} title="All clear" description="Nothing needs your attention right now." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 rounded-control border border-border-subtle p-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-text-primary">{item.title}</div>
                <Small className="block">{item.text}</Small>
              </div>
              {"generate" in item.action ? (
                <Button size="sm" className="shrink-0 max-md:h-11" onClick={onGenerate}>
                  {item.action.label}
                </Button>
              ) : (
                <Link to={item.action.to} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0 no-underline max-md:h-11")}>
                  {item.action.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
