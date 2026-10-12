import { Construction } from "lucide-react";
import { Card, EmptyState } from "@/components/molecules";
import { PageHeader } from "@/components/organisms";

/** Placeholder for pages not built yet. Each feature step replaces one. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card padding="none">
        <EmptyState icon={<Construction strokeWidth={1.5} />} title="Coming soon" description="This page is being built." />
      </Card>
    </>
  );
}
