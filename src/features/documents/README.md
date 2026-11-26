# src/features/documents

Files (PDF, images, Word, Excel, OpenDocument, CSV, text; max 20 MB) attached to one lease, tenant, unit, property or payment: the shared Documents panel used by the lease page, the tenant and unit drawers, the property page and a payment's files drawer. Also the multipart helpers the property photo uses.

## categories.ts
- `categoryOptions(categories, owner)`: that owner type's list in the API order (`leases` → `lease`, ...); `[]` while loading.
- `categoryLabel(categories, owner, value)`: the label from that owner type's own list (INSPECTION is "Other inspection" on leases, "Inspection" on units); while loading or for an unknown value, `fallbackCategoryLabel`. Never blank.
- `fallbackCategoryLabel(value)`: readable text from a value (`readableValue` in lib/labels) (`OLD_LEASE` → "Old lease").

## keys.ts
- `documentKeys`: `all`, `list(target)` (one list per record), `categories`. `units`: prefix of every unit's list.

## hooks.ts
- `useDocumentCategories()`: GET /documents/categories (`{ lease, tenant, unit, property, payment }`, each `{ value, label }[]` in display order). Static data, so fetched once per session (`staleTime`/`gcTime` Infinity). Used by the upload form and the list.
- `useDocuments(target)`: GET /{owner}/:id/documents (a payment's: /leases/:id/payments/:paymentId/documents), newest first. 404 when the record is out of scope (a manager on a tenant they can't see). A lease's list is asked with `includePayments=true` (its payments' files, with `paymentId`), a unit's also with `includeLeases=true` (its leases' documents, each with its `source`).
- `useUploadDocument()`: POST to the same path with a `documentForm` body (`{ target, form }`); refreshes that list.
- `useDeleteDocument()`: DELETE on the same path (`{ target, docId }`); refreshes that list. A lease's change (upload too) also refreshes the units' lists; a payment's also its lease's list and the ledger (`documentCount`).
- `useDownloadDocument()`: GET /documents/:id/download on the click, then `window.location.assign(url)` (the signed link is an attachment, valid 5 minutes, never stored).
- `useViewDocument()`: `{ docId, tab }`: GET /documents/:id/download?inline=true (via `showInTab`), then points the already-open tab at the link (PDF viewer or image). On failure the tab is closed and the error goes to `onError`. Never stored.
- `uploadErrorText(err, rule)`: the property photo's errors: 413 becomes "File too large (max 5 MB)."; others keep the backend message.

## view.ts
- `openBlankTab()`: `window.open("", "_blank")` in the click itself (before any await, so popup blockers allow it), sets `opener = null` and shows "Opening document…" as plain text; null when the browser blocked it.
- `fetchViewLink(docId)`: GET /documents/:id/download with `inline=true`: a fresh 5-minute link that opens in the browser.
- `showInTab(tab, docId, fetchLink?)`: gets the link and sets `tab.location.href`; on failure closes the tab and rethrows.
- `POPUP_BLOCKED_MESSAGE`: the toast text when the tab was blocked.

## form.ts
- `documentForm(file, category, name)`: the multipart body (`file`, `category`, `name` only when not blank, trimmed). No Content-Type is set by hand.
- `isFileError(message, status)`: a backend message about the file (400 "file ...", 413, 415): shown under the file as it is, in every form that sends a document.
- `photoForm(file)`: PUT /properties/:id/photo body (only `file`).
- `nameError(name)`, `MAX_NAME_LENGTH`: optional display name, max 200, no `/`, `\` or control characters.

## fileKind.ts
- `FileKind` (pdf, word, spreadsheet, image, other), `FILE_KIND_LABEL`, `fileKind(contentType)`: a stored document's kind. `pickedFileKind(file)`: a picked file's, by its extension.
- `canViewInBrowser(contentType)`: PDF, JPEG, PNG, WebP and GIF open in a tab; everything else (HEIC too) only downloads.

## FileKindIcon.tsx
- `FileKindIcon({ kind, className })`: the kind's icon in a soft square, with the kind as tooltip and label.

## signed.ts
- `SIGNED_LEASE_CATEGORY`, `signedCopies(docs)`: a lease's own SIGNED_LEASE documents (not a payment's files), newest first. Used by the lease page's "Lease" card.

## useDocumentActions.ts
- `useDocumentActions()`: `onView(doc)` (blank tab opened in the click, then the signed `inline=true` link; blocked tab or error as a toast), `onDownload(doc)` (toast on error), `viewingId`, `downloadingId`. Used by `DocumentsPanel` and the lease's signed copy.

## source.ts
- `ownerOfDocument(doc, list)`: the record a row belongs to (its category list, permission and delete path): its payment, else the source lease, else the list's record.
- `sourceText(doc, list)`: "Unit", "Lease LSE-2026-021", "Lease … · Payment PMT-…" in a unit's list, "Payment PMT-…" in a lease's, or null. `source.test.ts` covers both.

## DocumentsPanel.tsx
- `DocumentsPanel({ target, leaseState, onOpenLedger, emptyText })`: "Upload a document" ("Add a file" on a payment) card (only with `canManageDocuments`) and the list: DataTable from md (icon by type, name, category badge (`categoryLabel`), size, uploaded date and email, View, Download, Delete), CardList on phones (card tap views; kebab View / Download / Delete). A type the browser can't show (`canViewInBrowser`) has no View, and its card tap downloads. The panel is a size container: under 48rem wide (the tenant and unit drawers) View and Download are icon-only (name in aria-label and title) and the name and uploader email are capped and truncate, so the table never scrolls sideways. View errors and a blocked tab show as a toast "Couldn't open {name}". 5 states. Each row shows its source (a link to the lease, its Ledger tab for a payment's file; `onOpenLedger` on the lease page), takes its label from its own record's categories and deletes through that record with that record's permission.

## DocumentUpload.tsx
- `DocumentUpload({ target, defaultCategory, onUploaded, onCancel })`: drop zone + "Choose file" (one file), Category (that owner type's list from `useDocumentCategories`, API order, required; "Loading categories…" and disabled while loading; on error an InlineError with Retry and Upload disabled until it loads), Name (optional, file name as placeholder), "Uploading..." state, backend errors about the file (`isFileError`) under it, the others in an InlineError, toast "Uploaded {name}". `defaultCategory` preselects a category ("Upload signed lease": SIGNED_LEASE; reset to it after a save), `onUploaded` runs after a save, `onCancel` adds a Cancel button (in a modal). The file is checked first with `checkFile(DOCUMENT_RULE)`.
- `PickedFile({ file, onRemove, disabled })`: the chosen file with its icon (by extension), its size and a Remove button (also used by the Add old lease and Record Payment forms).

## DocumentDeleteDialog.tsx
- `DocumentDeleteDialog({ target, doc, onClose })`: ConfirmDialog "Delete {name}?"; errors show inside; toast "Deleted {name}".

## Tests (`npm test`)
- `categories.test.ts`: each owner type's list in API order, the same value with different labels per owner, the fallback while loading and for unknown values (never blank).
- `fileKind.test.ts`: the kind of every document type, picked files by extension, which types open in a tab.
- `signed.test.ts`: only the lease's own signed leases (not other categories, not a payment's files), newest first.
- `form.test.ts`: the multipart fields (blank name left out, trimmed), photo form, `isFileError`, `nameError` limits.
- `view.test.ts`: the `inline=true` query, the blank tab (opener cut, placeholder text, blocked tab), the tab pointed at the link, the failure path (tab closed, error rethrown) and a new link on each call.
