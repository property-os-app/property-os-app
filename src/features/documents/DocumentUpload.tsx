import { useId, useState } from "react";
import { FileText, X } from "lucide-react";
import { Button, Caption, Input, Select } from "@/components/atoms";
import { FileDropzone, FormField, InlineError, toast } from "@/components/molecules";
import { acceptOf, checkFile, DOCUMENT_RULE, formatFileSize } from "@/lib/files";
import { documentCategoryLabels, labelOptions } from "@/lib/labels";
import { documentForm, MAX_NAME_LENGTH, nameError } from "@/features/documents/form";
import { uploadErrorText, useUploadDocument } from "@/features/documents/hooks";
import type { DocumentOwner } from "@/types/document";

/** The file the user picked, shown with its size and a Remove button. */
export function PickedFile({ file, onRemove, disabled }: { file: File; onRemove: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-control border border-border-subtle bg-surface-2 p-3">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-border-subtle bg-surface-3 text-text-muted">
        <FileText size={16} strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-small text-text-primary" title={file.name}>
          {file.name}
        </div>
        <Caption>{formatFileSize(file.size)}</Caption>
      </div>
      <Button size="sm" variant="ghost" iconOnly aria-label={`Remove ${file.name}`} disabled={disabled} onClick={onRemove} className="max-md:size-11">
        <X size={16} strokeWidth={1.5} />
      </Button>
    </div>
  );
}

/**
 * Upload one document: drop zone + "Choose file", category (that owner's list, required), optional display name.
 * The type and size are checked here before sending; backend errors (400, 403, 404, 409, 413, 415) show inside.
 */
export function DocumentUpload({ owner, ownerId }: { owner: DocumentOwner; ownerId: string }) {
  const upload = useUploadDocument();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const busy = upload.isPending;
  const nameProblem = nameError(name);

  const pick = (files: FileList) => {
    const next = files[0];
    if (!next) return;
    setServerError(null);
    const problem = checkFile(next, DOCUMENT_RULE);
    setFileError(problem);
    setFile(problem ? null : next);
  };

  const submit = () => {
    setServerError(null);
    if (!file) setFileError("Choose a file to upload.");
    if (!category) setCategoryError("Choose a category.");
    if (!file || !category || nameProblem) return;
    upload.mutate(
      { owner, ownerId, form: documentForm(file, category, name) },
      {
        onSuccess: (doc) => {
          toast.success(`Uploaded ${doc.name}`);
          setFile(null);
          setCategory("");
          setName("");
        },
        onError: (err) => setServerError(uploadErrorText(err, DOCUMENT_RULE)),
      },
    );
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      aria-label="Upload a document"
    >
      {serverError && <InlineError title="Couldn't upload the file" description={serverError} />}
      {file ? (
        <PickedFile file={file} disabled={busy} onRemove={() => setFile(null)} />
      ) : (
        <FileDropzone
          multiple={false}
          accept={acceptOf(DOCUMENT_RULE)}
          hint={`${DOCUMENT_RULE.typesText}, up to ${DOCUMENT_RULE.maxText}`}
          chooseLabel="Choose file"
          onFiles={pick}
          disabled={busy}
        />
      )}
      {fileError && (
        <p role="alert" className="m-0 text-small text-danger">
          {fileError}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Category" htmlFor={`${id}-category`} required error={categoryError}>
          <Select
            id={`${id}-category`}
            value={category}
            disabled={busy}
            onChange={(e) => {
              setCategory(e.target.value);
              setCategoryError(null);
            }}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {labelOptions(documentCategoryLabels[owner] as Record<string, string>).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Name" htmlFor={`${id}-name`} help={nameProblem ? undefined : "Optional. Blank uses the file name."} error={nameProblem}>
          <Input
            id={`${id}-name`}
            value={name}
            maxLength={MAX_NAME_LENGTH + 20}
            placeholder={file?.name ?? "e.g. Move-in inspection"}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy} aria-busy={busy || undefined} className="max-md:h-11 max-md:w-full">
          {busy ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </form>
  );
}
