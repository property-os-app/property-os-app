import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { env } from "@/lib/env";

/** The Firebase app, configured from env. */
export const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

/** Firebase Auth instance. auth.currentUser is null until the saved session is restored: await authReady first. */
export const auth = getAuth(app);

/** Resolves once Firebase has restored the session (first onAuthStateChanged call), with the user or null. */
export const authReady: Promise<User | null> = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe();
    resolve(user);
  });
});
