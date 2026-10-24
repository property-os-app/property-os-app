/**
 * Template editor: form schema, defaults, request bodies and server-error routing. Rules from
 * ../property-os-api/docs/frontend-handoff/rules.md ("Lease templates") and API.md (POST / PATCH /lease-templates).
 */
import { z } from "zod";
import { MAX_BODY_LENGTH } from "@/features/lease-templates/markdown";
import type { LeaseTemplateCreateBody, LeaseTemplateDetail, LeaseTemplateUpdateBody } from "@/types/leaseTemplate";

export const editorSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(100, "Name can be at most 100 characters."),
  description: z.string().trim().max(500, "Description can be at most 500 characters."),
  defaultTermMonths: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 120), "Use a whole number of months from 1 to 120.")
    .transform((v) => (v === "" ? null : Number(v))),
  body: z
    .string()
    .refine((v) => v.trim().length > 0, "Write the lease text.")
    .refine((v) => v.trim().length <= MAX_BODY_LENGTH, `The text can be at most ${MAX_BODY_LENGTH.toLocaleString("en-US")} characters.`),
  /** Create only: make it the default template. */
  isDefault: z.boolean(),
});

export type EditorInput = z.input<typeof editorSchema>;
export type EditorOutput = z.output<typeof editorSchema>;
export type EditorField = keyof EditorInput;

/** Form values from a saved template, or empty for a new one. */
export function editorDefaults(t?: LeaseTemplateDetail): EditorInput {
  return {
    name: t?.name ?? "",
    description: t?.description ?? "",
    defaultTermMonths: t?.defaultTermMonths != null ? String(t.defaultTermMonths) : "",
    body: t?.body ?? "",
    isDefault: false,
  };
}

/** POST /lease-templates body. Empty optional fields are left out. */
export function createTemplateBody(v: EditorOutput): LeaseTemplateCreateBody {
  return {
    name: v.name,
    ...(v.description ? { description: v.description } : {}),
    ...(v.defaultTermMonths !== null ? { defaultTermMonths: v.defaultTermMonths } : {}),
    body: v.body,
    ...(v.isDefault ? { isDefault: true } : {}),
  };
}

/** PATCH /lease-templates/:id body with only the details that changed (a cleared description or term is sent as null). Never the body. */
export function detailChanges(v: EditorOutput, t: LeaseTemplateDetail): LeaseTemplateUpdateBody {
  const body: LeaseTemplateUpdateBody = {};
  if (v.name !== t.name) body.name = v.name;
  if ((v.description || null) !== t.description) body.description = v.description || null;
  if (v.defaultTermMonths !== t.defaultTermMonths) body.defaultTermMonths = v.defaultTermMonths;
  return body;
}

/** True when the text differs from the saved version after trimming (the backend compares trimmed; the same text creates no version). */
export function bodyChanged(body: string, t: LeaseTemplateDetail): boolean {
  return body.trim() !== t.body.trim();
}

/** Backend field names that match the form's, for applyServerError. */
export const TEMPLATE_SERVER_FIELDS = ["name", "description", "defaultTermMonths", "body"] as const satisfies readonly EditorField[];

/**
 * The field a backend message that doesn't start with a field name belongs to: the duplicate name 409 goes under Name,
 * unknown merge fields and HTML under the text. null = show it at the top.
 */
export function templateErrorField(message: string): EditorField | null {
  if (/^A lease template named .* already exists/.test(message)) return "name";
  if (message.startsWith("Unknown merge fields") || message.includes("cannot contain HTML")) return "body";
  return null;
}
