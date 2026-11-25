import { useId, useState } from "react";
import { X } from "lucide-react";
import { Button, Caption, Input, Select } from "@/components/atoms";
import { FileDropzone, FormField, InlineError, toast } from "@/components/molecules";
import { acceptOf, checkFile, DOCUMENT_HINT, DOCUMENT_RULE, formatFileSize } from "@/lib/files";
import { ApiError, errorText } from "@/lib/api";
import { categoryOptions } from "@/features/documents/categories";
import { documentForm, isFileError, MAX_NAME_LENGTH, nameError } from "@/features/documents/form";
import { FileKindIcon } from "@/features/documents/FileKindIcon";
import { pickedFileKind } from "@/features/documents/fileKind";
import { useDocumentCategories, useUploadDocument } from "@/features/documents/hooks";
import type { DocumentRef } from "@/types/document";

/** Ends a backend message with a period so another sentence can follow it. */
const sentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

/** The file the user picked, shown with its icon (by extension), its size and a Remove button. */
export function PickedFile({ file, onRemove, disabled }: { file: File; onRemove: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-control border border-border-subtle bg-surface-2 p-3">
      <FileKindIcon kind={pickedFileKind(file)} className="size-10" />
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
 * Upload one document: drop zone + "Choose file", category (that owner type's list from GET /documents/categories, in the
 * API order; required), optional display name. Upload waits for the category list (loading: disabled; error: Retry).
 * The type and size are checked here before sending. Backend errors about the file (400 empty, 413, 415) show under it, the
 * others (400, 403, 404, 409) on top, as they are.
 */
export function DocumentUpload({ target }: { target: DocumentRef }) {
  const upload = useUploadDocument();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const categories = useDocumentCategories();
  const options = categoryOptions(categories.data, target.owner);
  const categoriesReady = categories.isSuccess;
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
    setFileError(file ? null : "Choose a file to upload.");
    if (!category) setCategoryError("Choose a category.");
    if (!file || !category || nameProblem || !categoriesReady) return;
    upload.mutate(
      { target, form: documentForm(file, category, name) },
      {
        onSuccess: (doc) => {
          toast.success(`Uploaded ${doc.name}`);
          setFile(null);
          setCategory("");
          setName("");
        },
        onError: (err) => {
          if (err instanceof ApiError && err.messages.length > 0) {
            const aboutFile = err.messages.filter((m) => isFileError(m, err.status));
            const rest = err.messages.filter((m) => !isFileError(m, err.status));
            setFileError(aboutFile.join(" ") || null);
            setServerError(rest.join(". ") || null);
          } else setServerError(errorText(err));
        },
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
        <PickedFile
          file={file}
          disabled={busy}
          onRemove={() => {
            setFile(null);
            setFileError(null);
          }}
        />
      ) : (
        <FileDropzone
          multiple={false}
          accept={acceptOf(DOCUMENT_RULE)}
          hint={DOCUMENT_HINT}
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
      {categories.isError && (
        <InlineError
          title="Couldn't load the categories"
          description={`${sentence(errorText(categories.error))} Upload is available once they load.`}
          onRetry={() => void categories.refetch()}
        />
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Category" htmlFor={`${id}-category`} required error={categoryError}>
          <Select
            id={`${id}-category`}
            value={category}
            disabled={busy || !categoriesReady}
            aria-busy={categories.isPending || undefined}
            onChange={(e) => {
              setCategory(e.target.value);
              setCategoryError(null);
            }}
          >
            <option value="" disabled>
              {categories.isPending ? "Loading categories…" : categories.isError ? "Categories unavailable" : "Choose a category"}
            </option>
            {options.map((o) => (
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
        <Button type="submit" disabled={busy || !categoriesReady} aria-busy={busy || undefined} className="max-md:h-11 max-md:w-full">
          {busy ? "Uploading..." : target.owner === "payments" ? "Add file" : "Upload"}
        </Button>
      </div>
    </form>
  );
}
