import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { Button, Caption, Checkbox, Dash, Input, Skeleton, Small, Tag, Textarea } from "@/components/atoms";
import { Card, FormField, InlineError, KeyValueList, StatusBadge, Tabs, toast } from "@/components/molecules";
import { ConfirmDialog, Drawer } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { applyServerError } from "@/lib/forms";
import { plural } from "@/lib/labels";
import { BodyEditor } from "@/features/lease-templates/BodyEditor";
import {
  TEMPLATE_SERVER_FIELDS,
  bodyChanged,
  createTemplateBody,
  detailChanges,
  editorDefaults,
  editorSchema,
  templateErrorField,
  type EditorInput,
  type EditorOutput,
} from "@/features/lease-templates/editorForm";
import { useCreateTemplate, useCreateTemplateVersion, useLeaseTemplate, useMergeFields, useUpdateTemplate } from "@/features/lease-templates/hooks";
import { mergeToken, unknownMergeKeys } from "@/features/lease-templates/markdown";
import { templateStatus, termText } from "@/features/lease-templates/status";
import { TemplateHistory } from "@/features/lease-templates/TemplateHistory";
import { TemplatePreview } from "@/features/lease-templates/TemplatePreview";
import { usePdfPreview, type PreviewSource } from "@/features/lease-templates/usePdfPreview";
import type { LeaseTemplateDetail } from "@/types/leaseTemplate";

export interface TemplateEditorProps {
  /** Edit (or view) this template; without it the editor creates one. */
  templateId?: string;
  /** No templates.manage: view the text, preview and history only. */
  readOnly?: boolean;
  /** After a successful save (before onClose), with the saved template. */
  onSaved?: (template: LeaseTemplateDetail) => void;
  onClose: () => void;
}

/**
 * The lease template editor in a Drawer (full screen on phones), tabs Edit · Preview · History. Loads the template first
 * when editing. Mount only while open: each opening starts from the saved template.
 */
export function TemplateEditor({ templateId, readOnly = false, onSaved, onClose }: TemplateEditorProps) {
  const detail = useLeaseTemplate(templateId);
  if (templateId && !detail.data) {
    return (
      <Drawer open onOpenChange={(open) => !open && onClose()} size="xl" title={readOnly ? "Lease template" : "Edit template"} footer={<Button onClick={onClose}>Close</Button>}>
        {detail.isError ? (
          <InlineError
            title={detail.error instanceof ApiError && detail.error.status === 404 ? "This template no longer exists" : "Couldn't load the template"}
            description={errorText(detail.error)}
            onRetry={() => void detail.refetch()}
          />
        ) : (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading template">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-80 w-full" />
          </div>
        )}
      </Drawer>
    );
  }
  return <EditorForm template={detail.data} readOnly={readOnly && Boolean(detail.data)} onSaved={onSaved} onClose={onClose} />;
}

type Tab = "edit" | "preview" | "history";

function EditorForm({ template, readOnly, onSaved, onClose }: { template?: LeaseTemplateDetail; readOnly: boolean; onSaved?: (t: LeaseTemplateDetail) => void; onClose: () => void }) {
  const isCreate = !template;
  // The last saved state: changes after a PATCH or a new version, so a failed second call compares with the right baseline.
  const [saved, setSaved] = useState(template);
  const [tab, setTab] = useState<Tab>("edit");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const createVersion = useCreateTemplateVersion();
  const mergeFields = useMergeFields();
  const preview = usePdfPreview();

  const form = useForm<EditorInput, unknown, EditorOutput>({ resolver: zodResolver(editorSchema), defaultValues: editorDefaults(template), mode: "onTouched" });
  const { register, control, handleSubmit, setError, setValue, getValues, resetField, reset, formState } = form;
  const { errors, isDirty, isSubmitting } = formState;
  const body = useWatch({ control, name: "body" });

  const archived = Boolean(saved?.archivedAt);
  const unknown = mergeFields.data ? unknownMergeKeys(body, mergeFields.data) : [];
  const busy = isSubmitting;

  /* ---------- Preview ---------- */

  // A saved, unchanged text previews the saved version (GET, anyone); edited text goes to POST /lease-templates/preview.
  const unchanged = saved !== undefined && !bodyChanged(body, saved);
  const previewKey = readOnly || unchanged ? `saved:${saved?.id}:${saved?.currentVersion}` : `body:${body.trim()}`;
  const previewSource = (): PreviewSource => (readOnly || unchanged ? { id: saved!.id, version: saved!.currentVersion } : { body });
  const previewBlocked = readOnly
    ? null
    : !body.trim()
      ? "Write some text first."
      : unknown.length > 0
        ? `Fix the unknown fields first: ${unknown.map(mergeToken).join(", ")}. Only fields from "Insert field" work.`
        : null;
  const refreshPreview = () => {
    if (!previewBlocked) preview.load(previewSource(), previewKey);
  };
  const onTab = (next: Tab) => {
    setTab(next);
    // Load when the tab opens, and only if the text changed since the last preview.
    if (next === "preview" && !previewBlocked && preview.loadedKey !== previewKey && !preview.loading) preview.load(previewSource(), previewKey);
  };

  /* ---------- Close ---------- */

  const confirmClose = () => {
    if (!isDirty || readOnly) return true;
    setConfirmingDiscard(true);
    return false;
  };
  const requestClose = () => {
    if (!busy && confirmClose()) onClose();
  };

  /* ---------- Save ---------- */

  /** Field messages go under their field (and back to the Edit tab); the rest at the top. */
  const showError = (err: unknown, prefix?: string) => {
    const general = applyServerError(setError, err, TEMPLATE_SERVER_FIELDS).filter((m) => {
      const field = templateErrorField(m);
      if (field) setError(field, { type: "server", message: m }, { shouldFocus: true });
      return !field;
    });
    setTab("edit");
    const messages = general.length > 0 ? general : prefix ? ["See the field messages below."] : [];
    setFormErrors(prefix ? [prefix, ...messages] : messages);
  };

  const save = async (v: EditorOutput) => {
    setFormErrors([]);
    if (!saved) {
      try {
        const created = await create.mutateAsync(createTemplateBody(v));
        toast.success(`Created ${created.name}`);
        onSaved?.(created);
        onClose();
      } catch (err) {
        showError(err);
      }
      return;
    }

    // 1. Details (PATCH), never a new version.
    let current = saved;
    const details = detailChanges(v, current);
    const detailsSaved = Object.keys(details).length > 0;
    if (detailsSaved) {
      try {
        current = await update.mutateAsync({ id: current.id, body: details });
      } catch (err) {
        showError(err);
        return;
      }
      setSaved(current);
      // The details are saved: they become the baseline; the text stays as typed (and dirty if it changed).
      for (const f of ["name", "description", "defaultTermMonths"] as const) resetField(f, { defaultValue: getValues(f) });
    }

    // 2. Text (POST …/versions). If it fails, the details stay saved and the unsaved text stays in the form to retry.
    let newVersion: number | null = null;
    if (!archived && bodyChanged(v.body, current)) {
      try {
        const next = await createVersion.mutateAsync({ id: current.id, body: v.body });
        if (next.currentVersion !== current.currentVersion) newVersion = next.currentVersion;
        current = next;
      } catch (err) {
        showError(err, detailsSaved ? "The name, description and term were saved. The new text wasn't saved yet:" : undefined);
        return;
      }
      setSaved(current);
    }

    reset(editorDefaults(current));
    toast.success(newVersion !== null ? `Saved ${current.name} as version ${newVersion}` : `Saved ${current.name}`);
    onSaved?.(current);
    onClose();
  };

  const submit = () => void handleSubmit(save, () => setTab("edit"))();

  /* ---------- Render ---------- */

  const nextVersion = (saved?.currentVersion ?? 0) + 1;
  const status = saved ? <StatusBadge domain="template" status={templateStatus(saved)} /> : undefined;

  const tabs = (
    <Tabs<Tab>
      value={tab}
      onChange={onTab}
      tabs={[
        { value: "edit", label: readOnly ? "Text" : "Edit" },
        { value: "preview", label: "Preview" },
        ...(saved ? [{ value: "history" as const, label: "History", count: saved.versions.length }] : []),
      ]}
    />
  );

  const footer = readOnly ? (
    <Button onClick={onClose}>Close</Button>
  ) : (
    <>
      <Button disabled={busy} onClick={requestClose}>
        Cancel
      </Button>
      <Button variant="primary" disabled={busy || (!isCreate && !isDirty)} aria-busy={busy || undefined} onClick={submit}>
        {busy ? "Saving..." : isCreate ? "Create template" : "Save changes"}
      </Button>
    </>
  );

  let content;
  if (tab === "preview") {
    content = <TemplatePreview preview={preview} onRefresh={refreshPreview} stale={preview.loadedKey !== previewKey} blocked={previewBlocked} />;
  } else if (tab === "history" && saved) {
    content = <TemplateHistory template={saved} />;
  } else if (readOnly && saved) {
    content = (
      <>
        <KeyValueList
          labelWidth={130}
          items={[
            { label: "Name", value: saved.name },
            { label: "Description", value: saved.description ?? <Dash /> },
            { label: "Default term", value: termText(saved.defaultTermMonths) ?? <Dash /> },
            { label: "Version", value: `v${saved.currentVersion}` },
            { label: "Used by", value: saved.leaseCount === 0 ? "No leases" : plural(saved.leaseCount, "lease") },
          ]}
        />
        <pre className="m-0 whitespace-pre-wrap break-words rounded-control border border-border-subtle bg-surface-2 p-3 font-mono text-small text-text-primary">
          {saved.body}
        </pre>
      </>
    );
  } else {
    content = (
      <>
        {formErrors.length > 0 && <InlineError title={formErrors.join(" ")} />}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField label="Name" htmlFor="te-name" required error={errors.name?.message} className="md:col-span-2">
            <Input id="te-name" autoComplete="off" {...register("name")} />
          </FormField>
          <FormField label="Default term (months)" htmlFor="te-term" error={errors.defaultTermMonths?.message} help="Fills a new lease's end date.">
            <Input id="te-term" inputMode="numeric" placeholder="e.g. 12" {...register("defaultTermMonths")} />
          </FormField>
          <FormField label="Description" htmlFor="te-description" error={errors.description?.message} className="md:col-span-3">
            <Textarea id="te-description" rows={2} className="min-h-16" {...register("description")} />
          </FormField>
          {isCreate && (
            <Checkbox label="Make this the default template for new leases" className="md:col-span-3" {...register("isDefault")} />
          )}
        </div>

        {saved && (
          <Card padding="compact" className="flex items-start gap-2.5 border-info/30 bg-info-soft">
            <Info size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-info" />
            <Small className="text-text-primary">
              {archived
                ? "This template is archived. Unarchive it to edit the text; the name, description and term can still change."
                : `Saving changes to the text creates version ${nextVersion}. Leases on older versions keep them. The name, description and term change in place.`}
            </Small>
          </Card>
        )}

        <FormField
          label="Lease text"
          htmlFor="te-body"
          required
          error={errors.body?.message}
          help="Markdown: # headings, **bold**, *italic*, - lists, > quotes, --- dividers and | tables |. No HTML."
        >
          <BodyEditor
            id="te-body"
            field={register("body")}
            locked={archived}
            onEdit={(text) => setValue("body", text, { shouldDirty: true, shouldValidate: Boolean(errors.body) })}
          />
        </FormField>

        {unknown.length > 0 && (
          <Card padding="compact" className="flex flex-col gap-2 border-warning/40 bg-warning-soft">
            <Small className="font-semibold text-warning">Unknown fields</Small>
            <div className="flex flex-wrap gap-1.5">
              {unknown.map((k) => (
                <Tag key={k} className="font-mono">
                  {mergeToken(k)}
                </Tag>
              ))}
            </div>
            <Caption>These won't be filled in, and saving gives an error. Use "Insert field" to pick a field from the list.</Caption>
          </Card>
        )}
      </>
    );
  }

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      confirmClose={confirmClose}
      size="xl"
      title={isCreate ? "New template" : readOnly ? saved!.name : "Edit template"}
      description={saved ? (readOnly ? `Version ${saved.currentVersion} · read-only` : `${saved.name} · version ${saved.currentVersion}`) : undefined}
      status={status}
      tabs={tabs}
      footer={footer}
    >
      {content}
      <ConfirmDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        title="Discard changes?"
        consequence={isCreate ? "This template won't be created." : "Your unsaved changes to this template will be lost."}
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setConfirmingDiscard(false);
          onClose();
        }}
      />
    </Drawer>
  );
}
