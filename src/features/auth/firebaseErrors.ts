import { FirebaseError } from "firebase/app";

/** Firebase error codes turned into simple words. Always switch on error.code, never on message text. */

function codeOf(error: unknown): string | undefined {
  return error instanceof FirebaseError ? error.code : undefined;
}

const TOO_MANY = "Too many tries. Wait a few minutes and try again.";
const OFFLINE = "No internet connection.";

/** Message for a failed sign-in. */
export function signInErrorText(error: unknown): string {
  switch (codeOf(error)) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is wrong.";
    case "auth/too-many-requests":
      return TOO_MANY;
    case "auth/network-request-failed":
      return OFFLINE;
    default:
      return "Sign in failed. Try again.";
  }
}

/** Message for a failed password reset email, or null when it should look like success (never reveal which emails exist). */
export function resetEmailErrorText(error: unknown): string | null {
  switch (codeOf(error)) {
    case "auth/user-not-found":
      return null;
    case "auth/invalid-email":
      return "Enter a valid email.";
    case "auth/too-many-requests":
      return TOO_MANY;
    case "auth/network-request-failed":
      return OFFLINE;
    default:
      return "Couldn't send the link. Try again.";
  }
}

/** Message for a failed verification email. */
export function verificationEmailErrorText(error: unknown): string {
  switch (codeOf(error)) {
    case "auth/too-many-requests":
      return TOO_MANY;
    case "auth/network-request-failed":
      return OFFLINE;
    default:
      return "Couldn't send the email. Try again.";
  }
}
