import { env } from "@/lib/env";
import type { User } from "firebase/auth";
import { auth, authReady } from "@/lib/firebase";
import { filenameFromDisposition } from "@/lib/pdf";

type QueryValue = string | number | boolean | null | undefined;

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Plain object, sent as JSON. */
  body?: unknown;
  /** Turned into ?a=1&b=2. undefined, null and "" are skipped. */
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

/** Error thrown by apiFetch. status 0 means the server could not be reached. */
export class ApiError extends Error {
  readonly status: number;
  /** Backend message, always as an array (the backend sends a string or an array). */
  readonly messages: string[];
  /** Backend "error" field, e.g. "Bad Request". */
  readonly error?: string;
  /** Backend "code" field. Only the auth errors have one, FORBIDDEN_PERMISSION included (see AuthErrorCode in types/auth.ts). */
  readonly code?: string;

  constructor(status: number, messages: string[], error?: string, code?: string) {
    super(messages.join(" ") || error || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
    this.error = error;
    this.code = code;
  }
}

/** Shown when the server can't be reached (backend down, offline). Modals keep the form and show it at the top. */
export const OFFLINE_MESSAGE = "Can't reach the server. Check your connection and try again.";
/** Shown for any 5xx: the backend body is always "Internal server error". */
export const SERVER_ERROR_MESSAGE = "Something went wrong on the server. Try again in a moment.";
/** Shown for 403 FORBIDDEN_ROLE instead of the backend text. */
export const FORBIDDEN_MESSAGE = "You don't have permission to do this.";

/** One display text for any thrown value (ApiError, Error or unknown). */
export function errorText(err: unknown): string {
  if (err instanceof ApiError) return err.messages.length > 0 ? err.messages.join(". ") : err.error || `Request failed (${err.status})`;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${env.VITE_API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function toMessages(message: unknown): string[] {
  if (Array.isArray(message)) return message.map(String);
  if (typeof message === "string" && message) return [message];
  return [];
}

/** The Firebase token; refreshing it offline fails with auth/network-request-failed, which becomes the offline error. */
async function getToken(user: User): Promise<string> {
  try {
    return await user.getIdToken();
  } catch (err) {
    if ((err as { code?: unknown })?.code === "auth/network-request-failed") throw new ApiError(0, [OFFLINE_MESSAGE]);
    throw err;
  }
}

/** Friendly texts for 5xx and FORBIDDEN_ROLE; other errors keep the backend message (FORBIDDEN_PERMISSION says which switch to ask for). */
function friendlyMessages(status: number, code: string | undefined, messages: string[]): string[] {
  if (status >= 500) return [SERVER_ERROR_MESSAGE];
  if (code === "FORBIDDEN_ROLE") return [FORBIDDEN_MESSAGE];
  return messages;
}

/** Sends the request with the Firebase token when signed in. A network failure becomes the offline ApiError. */
async function send(path: string, options: ApiFetchOptions, accept: string): Promise<Response> {
  const { method = "GET", body, query, signal } = options;

  await authReady;
  const headers: Record<string, string> = { Accept: accept };
  const user = auth.currentUser;
  if (user) headers.Authorization = `Bearer ${await getToken(user)}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  try {
    return await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, [OFFLINE_MESSAGE]);
  }
}

/** Reads a body as JSON when it parses, else as text; "" for 204 or an empty body. */
async function readBody(res: Response): Promise<unknown> {
  const text = res.status === 204 ? "" : await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** The ApiError for a failed response body (JSON error body or plain text). */
function toApiError(res: Response, data: unknown): ApiError {
  const obj = typeof data === "object" && data !== null ? (data as { message?: unknown; error?: unknown; code?: unknown }) : {};
  const code = typeof obj.code === "string" ? obj.code : undefined;
  const messages = typeof data === "string" ? toMessages(data) : toMessages(obj.message);
  return new ApiError(
    res.status,
    friendlyMessages(res.status, code, messages),
    typeof obj.error === "string" ? obj.error : res.statusText || undefined,
    code,
  );
}

/** Calls the backend: adds the Firebase token when signed in, parses JSON, throws ApiError on failure. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await send(path, options, "application/json");
  const data = await readBody(res);
  if (!res.ok) throw toApiError(res, data);
  return data as T;
}

/** A file answer: the bytes and the filename from Content-Disposition (null when missing). */
export interface ApiBlob {
  blob: Blob;
  filename: string | null;
}

/**
 * Calls an endpoint that answers with a file (the lease and template PDFs). Checks res.ok first: errors come back as the
 * normal JSON error body and throw ApiError like apiFetch.
 */
export async function apiFetchBlob(path: string, options: ApiFetchOptions = {}): Promise<ApiBlob> {
  const res = await send(path, options, "application/pdf, application/json");
  if (!res.ok) throw toApiError(res, await readBody(res));
  let blob: Blob;
  try {
    blob = await res.blob();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, [OFFLINE_MESSAGE]);
  }
  return { blob, filename: filenameFromDisposition(res.headers.get("Content-Disposition")) };
}
