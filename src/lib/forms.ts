import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError, errorText } from "@/lib/api";

/**
 * Shows a backend error on a react-hook-form form.
 * A message that starts with one of `fieldNames` ("zip should not be empty") goes under that field
 * (several messages for one field are joined). Every other message is returned, for an InlineError at the top.
 * Works when the backend message is a string or an array (ApiError.messages is always an array).
 */
export function applyServerError<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  fieldNames: readonly Path<T>[],
): string[] {
  return applyServerErrorBy(setError, error, (message) => fieldNames.find((name) => message === name || message.startsWith(`${name} `)) ?? null);
}

/**
 * Like applyServerError, but `fieldOf(message)` picks the field (null = top of the form), for messages that don't start
 * with a field name (e.g. a 409 "A vendor named ... already exists." under Name).
 */
export function applyServerErrorBy<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  fieldOf: (message: string) => Path<T> | null,
): string[] {
  if (!(error instanceof ApiError) || error.messages.length === 0) return [errorText(error)];

  const byField = new Map<Path<T>, string[]>();
  const general: string[] = [];
  for (const message of error.messages) {
    const field = fieldOf(message);
    if (field) byField.set(field, [...(byField.get(field) ?? []), message]);
    else general.push(message);
  }
  let first = true;
  for (const [field, messages] of byField) {
    setError(field, { type: "server", message: messages.map(capitalize).join(". ") }, { shouldFocus: first });
    first = false;
  }
  return general;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
