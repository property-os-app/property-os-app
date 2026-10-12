import { Body, Button } from "@/components/atoms";
import { useAuth } from "@/features/auth/authContext";
import { AuthShell } from "@/features/auth/AuthShell";

/** Shown when GET /auth/me returns USER_NOT_REGISTERED. Stays signed in on purpose (no auto sign-out, no loop). */
export function NotRegisteredPage() {
  const { signOut } = useAuth();
  return (
    <AuthShell title="Account not set up">
      <Body>Your account isn't set up yet. Ask the owner to add you.</Body>
      <Button size="lg" block onClick={() => void signOut()}>
        Sign out
      </Button>
    </AuthShell>
  );
}
