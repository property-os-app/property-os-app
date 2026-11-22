# src/features/documents

Files (PDF, JPEG, PNG; max 20 MB) attached to one lease, tenant, unit or property: the shared Documents panel used by the lease page, the tenant and unit drawers and the property page. Also the multipart helpers the property photo uses.

## keys.ts
- `documentKeys`: `all`, `list(owner, ownerId)` (one list per record).

## hooks.ts
- `useDocuments(owner, ownerId)`: GET /{owner}/:id/documents, newest first. 404 when the record is out of scope (a manager on a tenant they can't see).
- `useUploadDocument()`: POST /{owner}/:id/documents with a `documentForm` body (`{ owner, ownerId, form }`); refreshes that list.
- `useDeleteDocument()`: DELETE /{owner}/:id/documents/:docId (`{ owner, ownerId, docId }`); refreshes that list.
- `useDownloadDocument()`: GET /documents/:id/download on the click, then `window.location.assign(url)` (the signed link is an attachment, valid 5 minutes, never stored).
- `uploadErrorText(err, rule)`: 413 becomes "File too large (max 20 MB)."; other errors keep the backend message.

## form.ts
- `documentForm(file, category, name)`: the multipart body (`file`, `category`, `name` only when not blank, trimmed). No Content-Type is set by hand.
- `photoForm(file)`: PUT /properties/:id/photo body (only `file`).
- `nameError(name)`, `MAX_NAME_LENGTH`: optional display name, max 200, no `/`, `\` or control characters.

## DocumentsPanel.tsx
- `DocumentsPanel({ owner, ownerId, canManage, emptyText })`: "Upload a document" card (only with `canManage`) and the list: DataTable from md (icon by type, name, category badge, size, uploaded date and email, Download, Delete), CardList on phones (card tap downloads; kebab Download / Delete). 5 states.

## DocumentUpload.tsx
- `DocumentUpload({ owner, ownerId })`: drop zone + "Choose file" (one file), Category (that owner's list, required), Name (optional, file name as placeholder), "Uploading..." state, backend errors in an InlineError, toast "Uploaded {name}". The file is checked first with `checkFile(DOCUMENT_RULE)`.
- `PickedFile({ file, onRemove, disabled })`: the chosen file with its size and a Remove button (also used by the Add old lease form).

## DocumentDeleteDialog.tsx
- `DocumentDeleteDialog({ owner, ownerId, doc, onClose })`: ConfirmDialog "Delete {name}?"; errors show inside; toast "Deleted {name}".

## Tests (`npm test`)
- `form.test.ts`: the multipart fields (blank name left out, trimmed), photo form, `nameError` limits.
