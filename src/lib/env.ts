/** Typed access to the Vite env variables. Values come from .env.local (never committed). */

const raw = {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

export type Env = { [K in keyof typeof raw]: string };

/** Names of variables that are missing or empty. main.tsx shows them on the page instead of starting the app. */
export const missingEnv: string[] = Object.entries(raw)
  .filter(([, value]) => typeof value !== "string" || value.trim() === "")
  .map(([name]) => name);

/** All env values, trimmed. VITE_API_URL has no trailing slash. Only safe to use when missingEnv is empty. */
export const env: Env = {
  VITE_API_URL: (raw.VITE_API_URL ?? "").trim().replace(/\/+$/, ""),
  VITE_FIREBASE_API_KEY: (raw.VITE_FIREBASE_API_KEY ?? "").trim(),
  VITE_FIREBASE_AUTH_DOMAIN: (raw.VITE_FIREBASE_AUTH_DOMAIN ?? "").trim(),
  VITE_FIREBASE_PROJECT_ID: (raw.VITE_FIREBASE_PROJECT_ID ?? "").trim(),
  VITE_FIREBASE_APP_ID: (raw.VITE_FIREBASE_APP_ID ?? "").trim(),
};
