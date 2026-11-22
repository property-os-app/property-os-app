/** The upload form's rules and the multipart body. No API import, so it is unit-testable. */

/** Max length of a display name (API: trimmed, max 200). */
export const MAX_NAME_LENGTH = 200;

const hasControlChar = (s: string) => [...s].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);

/** null when the optional display name is fine, else a message. Blank is fine (the file name is used). */
export function nameError(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length > MAX_NAME_LENGTH) return `Use at most ${MAX_NAME_LENGTH} characters.`;
  if (/[/\\]/.test(trimmed) || hasControlChar(trimmed)) return "The name can't contain /, \\ or control characters.";
  return null;
}

/**
 * The multipart body of POST /{owner}/:id/documents: `file` (with its file name), `category`, and `name` only when not
 * blank (trimmed). Send it as is; the browser sets the Content-Type with the boundary.
 */
export function documentForm(file: File, category: string, name = ""): FormData {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("category", category);
  const trimmed = name.trim();
  if (trimmed) form.append("name", trimmed);
  return form;
}

/** The multipart body of PUT /properties/:id/photo: only `file` (any other field is 400). */
export function photoForm(file: File): FormData {
  const form = new FormData();
  form.append("file", file, file.name);
  return form;
}
