import type { ReactNode } from "react";
import { Body, Display, H1, Small } from "@/components/atoms";
import { AuthLayout } from "@/components/templates";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

/** Every auth screen: AuthLayout with the brand row, a title + description, and the brand panel on the right. */
export function AuthShell({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  useDocumentTitle(title);
  return (
    <AuthLayout aside={<BrandPanel />}>
      <div className="mb-4 flex items-center gap-2.5">
        {/* Same look as the Sidebar logo, at 32px. */}
        <div className="flex size-8 items-center justify-center rounded-control bg-success text-body font-extrabold text-success-fg">P</div>
        <div className="text-h3 font-extrabold tracking-tight">PropertyOS</div>
      </div>
      <div className="flex flex-col gap-1">
        <H1>{title}</H1>
        {description && <Small>{description}</Small>}
      </div>
      {children}
    </AuthLayout>
  );
}

function BrandPanel() {
  return (
    <>
      <Display as="p" className="m-0 max-w-[560px] font-extrabold">
        Every unit, lease, and dollar in one calm command center.
      </Display>
      <Body className="max-w-[480px] text-body-lg text-text-secondary">
        Rent collection, leases and tenants for your whole portfolio, in one place.
      </Body>
    </>
  );
}
