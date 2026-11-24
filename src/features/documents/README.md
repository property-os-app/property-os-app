# src/features/documents

Files (PDF, JPEG, PNG; max 20 MB) attached to one lease, tenant, unit or property: the shared Documents panel used by the lease page, the tenant and unit drawers and the property page. Also the multipart helpers the property photo uses.

## categories.ts
- `categoryOptions(categories, owner)`: that owner type's list in the API order (`leases` → `lease`, ...); `[]` while loading.
- `categoryLabel(categories, owner, value)`: the label from that owner type's own list (INSPECTION is "Other inspection" on leases, "Inspection" on units); while loading or for an unknown value, `fallbackCategoryLabel`. Never blank.
- `fallbackCategoryLabel(value)`: readable text from a value (`readableValue` in lib/labels) (`OLD_LEASE` → "Old lease").

## keys.ts
- `documentKeys`: `all`, `list(owner, ownerId)` (one list per record), `categories`.

## hooks.ts
- `useDocumentCategories()`: GET /documents/categories (`{ lease, tenant, unit, property }`, each `{ value, label }[]` in display order). Static data, so fetched once per session (`staleTime`/`gcTime` Infinity). Used by the upload form and the list.
- `useDocuments(owner, ownerId)`: GET /{owner}/:id/documents, newest first. 404 when the record is out of scope (a manager on a tenant they can't see).
- `useUploadDocument()`: POST /{owner}/:id/documents with a `documentForm` body (`{ owner, ownerId, form }`); refreshes that list.
- `useDeleteDocument()`: DELETE /{owner}/:id/documents/:docId (`{ owner, ownerId, docId }`); refreshes that list.
- `useDownloadDocument()`: GET /documents/:id/download on the click, then `window.location.assign(url)` (the signed link is an attachment, valid 5 minutes, never stored).
- `useViewDocument()`: `{ docId, tab }`: GET /documents/:id/download?inline=true (via `showInTab`), then points the already-open tab at the link (PDF viewer or image). On failure the tab is closed and the error goes to `onError`. Never stored.
- `uploadErrorText(err, rule)`: 413 becomes "File too large (max 20 MB)."; other errors keep the backend message.

## view.ts
- `openBlankTab()`: `window.open("", "_blank")` in the click itself (before any await, so popup blockers allow it), sets `opener = null` and shows "Opening document…" as plain text; null when the browser blocked it.
- `fetchViewLink(docId)`: GET /documents/:id/download with `inline=true`: a fresh 5-minute link that opens in the browser.
- `showInTab(tab, docId, fetchLink?)`: gets the link and sets `tab.location.href`; on failure closes the tab and rethrows.
- `POPUP_BLOCKED_MESSAGE`: the toast text when the tab was blocked.

## form.ts
- `documentForm(file, category, name)`: the multipart body (`file`, `category`, `name` only when not blank, trimmed). No Content-Type is set by hand.
- `photoForm(file)`: PUT /properties/:id/photo body (only `file`).
- `nameError(name)`, `MAX_NAME_LENGTH`: optional display name, max 200, no `/`, `\` or control characters.

## DocumentsPanel.tsx
- `DocumentsPanel({ owner, ownerId, canManage, emptyText })`: "Upload a document" card (only with `canManage`) and the list: DataTable from md (icon by type, name, category badge (`categoryLabel`), size, uploaded date and email, View, Download, Delete), CardList on phones (card tap views; kebab View / Download / Delete). The panel is a size container: under 48rem wide (the tenant and unit drawers) View and Download are icon-only (name in aria-label and title) and the name and uploader email are capped and truncate, so the table never scrolls sideways. View errors and a blocked tab show as a toast "Couldn't open {name}". 5 states.

## DocumentUpload.tsx
- `DocumentUpload({ owner, ownerId })`: drop zone + "Choose file" (one file), Category (that owner type's list from `useDocumentCategories`, API order, required; "Loading categories…" and disabled while loading; on error an InlineError with Retry and Upload disabled until it loads), Name (optional, file name as placeholder), "Uploading..." state, backend errors in an InlineError, toast "Uploaded {name}". The file is checked first with `checkFile(DOCUMENT_RULE)`.
- `PickedFile({ file, onRemove, disabled })`: the chosen file with its size and a Remove button (also used by the Add old lease form).

## DocumentDeleteDialog.tsx
- `DocumentDeleteDialog({ owner, ownerId, doc, onClose })`: ConfirmDialog "Delete {name}?"; errors show inside; toast "Deleted {name}".

## Tests (`npm test`)
- `categories.test.ts`: each owner type's list in API order, the same value with different labels per owner, the fallback while loading and for unknown values (never blank).
- `form.test.ts`: the multipart fields (blank name left out, trimmed), photo form, `nameError` limits.
- `view.test.ts`: the `inline=true` query, the blank tab (opener cut, placeholder text, blocked tab), the tab pointed at the link, the failure path (tab closed, error rethrown) and a new link on each call.
