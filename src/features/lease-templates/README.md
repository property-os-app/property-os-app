# src/features/lease-templates

Lease templates: the Settings → Lease templates tab (list, default, archive, delete), the template editor (Markdown body with a toolbar and "Insert field", PDF preview, version history) and their queries. Owner and every manager can read and preview; every write needs `templates.manage` (`can(me, "template.manage")`). API: ../property-os-api/docs/frontend-handoff/API.md ("Lease templates").

## keys.ts
- `templateKeys`: `all`, `lists`, `list(includeArchived)`, `detail(id)`, `version(id, version)`, `mergeFields`.

## hooks.ts
- `useLeaseTemplates({ includeArchived?, enabled? })`: GET /lease-templates (default first, then A→Z; archived only with `includeArchived`).
- `useLeaseTemplate(id)`: GET /lease-templates/:id (current body + versions).
- `useTemplateVersion(id, version)`: GET …/versions/:version (kept forever: versions never change).
- `useMergeFields()`: GET /lease-templates/merge-fields, kept 1 hour.
- `useCreateTemplate()`, `useUpdateTemplate()` (PATCH details), `useCreateTemplateVersion()` (POST …/versions), `useArchiveTemplate()` (archive / unarchive), `useSetDefaultTemplate()` (POST / DELETE …/default), `useDeleteTemplate()`: the writes. Each puts the saved detail in the cache and refreshes the lists and leases (they embed the name and archived flag).
- `useTemplatePreviewPdf()`: the sample PDF of an unsaved body (POST /lease-templates/preview) or a saved version (GET …/preview?version=), as a blob. A mutation, so it runs only when asked.

## status.ts
- `templateStatus(t)`: "ARCHIVED", "DEFAULT" or "ACTIVE" for `StatusBadge domain="template"`.
- `termText(months)`: "12 months" / "1 month", or null.

## markdown.ts
Pure text helpers (unit-tested).
- `insertAtCursor(text, start, end, insert)`: replaces the selection; cursor after it. `TextEdit`: text + selection.
- `wrapSelection(text, start, end, marker, placeholder)`: bold / italic; edge spaces stay outside; no selection inserts a selected placeholder; already wrapped → unwraps.
- `prefixLines(text, start, end, prefix | "numbered")`: heading, bullets, numbers, quotes on every touched line (blank lines skipped); toggles off when all lines have it; a heading replaces another level.
- `insertBlock(text, start, end, block)`: "---" on its own line with blank lines around.
- `mergeToken(key)`: "{{key}}". `mergeKeysIn(body)`: keys used, once each. `unknownMergeKeys(body, fields)`: keys not in the catalog.
- `groupMergeFields(fields, query)`: fields by group (API order), filtered by label, key, group or sample. `MergeFieldGroup`.
- `MAX_BODY_LENGTH`: 50,000.

## editorForm.ts
- `editorSchema`, `EditorInput`, `EditorOutput`, `EditorField`: name (1–100), description (≤ 500), default term ("" or 1–120 → number | null), body (1–50,000 after trimming), `isDefault` (create only).
- `editorDefaults(template?)`: form values from a template, or empty.
- `createTemplateBody(values)`: POST body, empty fields left out. `detailChanges(values, template)`: PATCH body with only changed details (cleared = null). `bodyChanged(body, template)`: trimmed text differs.
- `TEMPLATE_SERVER_FIELDS`, `templateErrorField(message)`: backend messages under their field (duplicate name → Name; unknown merge fields and HTML → text).

## usePdfPreview.ts
- `usePdfPreview()`: one preview PDF as an object URL (`url`, `loadedKey`, `loading`, `error`, `load(source, key)`). Loads only when `load` is called; frees the previous object URL when a new one loads and the last one on unmount; drops a slower older answer. `PreviewSource`, `PdfPreview`: its types.

## TemplatesPage.tsx
- `TemplatesPage`: /settings/templates inside `SettingsFrame`. H2 + one line, "New template" (templates.manage), toolbar with "Show archived" (refetches with `includeArchived=true`) and a count, `TemplatesTable` with all states, the editor and the archive / delete confirms. Default on / off and unarchive run from the kebab with a toast (errors as a toast). Without templates.manage: no buttons, rows open read-only.

## TemplatesTable.tsx
- `TemplatesTable({ rows, state, empty, error, actions })`: DataTable from md up (Template + description, Version, Used by, Updated, Status, kebab), `ListCard`s on phones (archived ones muted). Kebab: Edit / Set as default or Remove default / Archive / Delete (unused only), Unarchive for archived; View only without templates.manage. `TemplateRowActions`: the handlers (memoize them).

## TemplateConfirms.tsx
- `ArchiveTemplateDialog({ template, onClose })`: "Archive {name}?" (can't be picked, stops being default, leases keep it); 409 inside.
- `DeleteTemplateDialog({ template, onClose })`: "Delete {name}?" (destructive); the backend 409 ("used by n lease(s). Archive it instead.") inside.

## TemplateEditor.tsx
- `TemplateEditor({ templateId?, readOnly?, onSaved?, onClose })`: Drawer (xl, full screen on phones), loads the template first (skeleton / error). Tabs Edit · Preview · History (History only for saved templates).
  - Edit: name, default term, description, "Make this the default" (create), the info line "Saving changes to the text creates version {n+1}. Leases on older versions keep them." (archived: "Unarchive it to edit the text"), `BodyEditor`, and an "Unknown fields" warning.
  - Save: create = POST. Edit = PATCH when details changed, then POST …/versions when the text changed. If the version fails, the details stay saved (new baseline), the error shows at the top, and the text stays unsaved and dirty to retry. Backend messages go under their field or at the top.
  - Preview: loads when the tab opens and only if the text changed since the last preview; "Refresh preview" reloads. Saved, unchanged text uses GET …/preview; edited text uses POST /lease-templates/preview. Blocked (no fetch) while the text is empty or has unknown fields.
  - Read-only (no templates.manage): details, the text, Preview of the saved version and History. Closing with changes asks "Discard changes?".
  Used by `TemplatesPage` and the lease wizard ("+ New template").

## BodyEditor.tsx
- `BodyEditor({ id, field, onEdit, invalid, locked })`: Markdown textarea (monospace) with a toolbar (Heading, Bold, Italic, Bulleted list, Numbered list, Divider, Quote) that edits at the cursor without taking the focus, Ctrl/⌘+B and +I, and "Insert field" (`InsertFieldModal`, inserts at the saved cursor). `locked`: no toolbar, read-only.

## InsertFieldModal.tsx
- `InsertFieldModal({ onPick, onClose })`: Modal over the editor with a search box and the merge fields by group (label, {{key}}, sample); loading, error with Retry, no matches.

## TemplatePreview.tsx
- `TemplatePreview({ preview, onRefresh, stale, blocked })`: the Preview tab: caption, "Refresh preview", blocked / out-of-date / error notes, the PDF in an iframe from md up, or "Open preview PDF" (new tab) on phones.

## TemplateHistory.tsx
- `TemplateHistory({ template })`: every version newest first (Current badge, date, author, leases using it), "View text" (loads that version) and "Preview PDF" (new tab).

## Tests (`npm test`)
- `markdown.test.ts`: insert at the cursor, bold / italic wrapping and toggling, line prefixes (heading, bullets, numbers, quotes, empty line), divider block, merge keys and unknown keys, grouping and search.
- `editorForm.test.ts`: schema (trim, term 1–120, blank text), create body, detail changes (only changed, null when cleared, never the body), trimmed body compare, error routing.
