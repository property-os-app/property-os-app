import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button";
import { H2 } from "@/components/atoms/Typography";
import { InlineError } from "@/components/molecules/Feedback";

/* Radix Dialog gives focus trapping, Escape to close, scroll lock and focus return for free. */

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Status badge or other element shown next to the title. */
  status?: React.ReactNode;
  /** Tabs row rendered under the header. */
  tabs?: React.ReactNode;
  /** Sticky footer with actions. */
  footer?: React.ReactNode;
  size?: "default" | "lg" | "xl";
  /** Ask "Discard changes?" before closing when a form is dirty. */
  confirmClose?: () => boolean;
  children: React.ReactNode;
}

/** Right-side drawer, 480 / 640 / 800px; full-screen sheet under 768px. Never stack a drawer on a drawer. */
export function Drawer({ open, onOpenChange, title, description, status, tabs, footer, size = "default", confirmClose, children }: DrawerProps) {
  const handleChange = (next: boolean) => {
    if (!next && confirmClose && !confirmClose()) return;
    onOpenChange(next);
  };
  return (
    <Dialog.Root open={open} onOpenChange={handleChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-overlay shadow-overlay outline-none md:rounded-l-overlay md:border-l md:border-border-subtle",
            "transition-transform duration-overlay ease-overlay data-[state=closed]:translate-x-full data-[state=open]:translate-x-0",
            size === "default" && "md:w-drawer",
            size === "lg" && "md:w-drawer-lg",
            size === "xl" && "md:w-drawer-xl",
          )}
        >
          <div className="flex items-center gap-3 border-b border-border-subtle px-6 py-5">
            <div className="min-w-0 flex-1">
              <Dialog.Title asChild><H2 className="truncate">{title}</H2></Dialog.Title>
              {description && <Dialog.Description className="mt-0.5 text-small text-text-secondary">{description}</Dialog.Description>}
            </div>
            {status}
            <Dialog.Close asChild>
              <Button variant="ghost" iconOnly aria-label="Close" icon={<X size={20} strokeWidth={1.5} />} />
            </Dialog.Close>
          </div>
          {tabs && <div className="px-6">{tabs}</div>}
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">{children}</div>
          {footer && <div className="flex justify-end gap-3 border-t border-border-subtle bg-overlay px-6 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "default" | "lg";
  confirmClose?: () => boolean;
  children: React.ReactNode;
}

/** Centered modal, 480 / 640px; bottom sheet under 768px. Secondary button sits left of the primary in the footer. */
export function Modal({ open, onOpenChange, title, description, footer, size = "default", confirmClose, children }: ModalProps) {
  const handleChange = (next: boolean) => {
    if (!next && confirmClose && !confirmClose()) return;
    onOpenChange(next);
  };
  return (
    <Dialog.Root open={open} onOpenChange={handleChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex max-h-[90vh] flex-col bg-overlay shadow-overlay outline-none",
            "inset-x-0 bottom-0 rounded-t-overlay md:inset-x-auto md:bottom-auto md:left-1/2 md:top-24 md:-translate-x-1/2 md:rounded-overlay md:border md:border-border-subtle",
            size === "default" ? "md:w-modal" : "md:w-modal-lg",
          )}
        >
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-5">
            <div>
              <Dialog.Title asChild><H2>{title}</H2></Dialog.Title>
              {description && <Dialog.Description className="mt-0.5 text-small text-text-secondary">{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" iconOnly aria-label="Close" icon={<X size={16} strokeWidth={1.5} />} />
            </Dialog.Close>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto p-6">{children}</div>
          {footer && <div className="flex justify-end gap-3 border-t border-border-subtle px-6 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Name the consequence: "This removes it from all reports." */
  consequence: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  /** For property, lease and user deletion: the user must type this name. */
  typeToConfirm?: string;
  /**
   * Optional async mode. When `busy` or `error` is passed, the dialog stays open after Confirm:
   * the caller closes it on success. `busy` disables the buttons; `error` shows an InlineError.
   */
  busy?: boolean;
  error?: string | null;
}

export function ConfirmDialog({ open, onOpenChange, title, consequence, confirmLabel, onConfirm, destructive, typeToConfirm, busy, error }: ConfirmDialogProps) {
  const [typed, setTyped] = React.useState("");
  const ready = !typeToConfirm || typed === typeToConfirm;
  const asyncMode = busy !== undefined || error !== undefined;
  // The caller may close the dialog itself (async mode): clear the typed name then too.
  React.useEffect(() => { if (!open) setTyped(""); }, [open]);
  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (busy) return; setTyped(""); onOpenChange(o); }}
      title={title}
      footer={
        <>
          <Button disabled={busy} onClick={() => { setTyped(""); onOpenChange(false); }}>Cancel</Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            disabled={!ready || busy}
            aria-busy={busy || undefined}
            onClick={() => { onConfirm(); if (!asyncMode) { setTyped(""); onOpenChange(false); } }}
          >
            {busy ? "Working..." : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="m-0 text-body">{consequence}</p>
      {error && <InlineError title={error} />}
      {typeToConfirm && (
        <label className="flex flex-col gap-1.5 text-small text-text-secondary">
          Type <strong className="text-text-primary">{typeToConfirm}</strong> to confirm
          <input value={typed} onChange={(e) => setTyped(e.target.value)} className="h-10 rounded-control border border-border-strong bg-surface-2 px-3 text-body text-text-primary outline-none focus:border-success" />
        </label>
      )}
    </Modal>
  );
}
