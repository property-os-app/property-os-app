import { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { Body, Button } from "@/components/atoms";
import { InlineError, toast } from "@/components/molecules";
import { useAuth } from "@/features/auth/authContext";
import { AuthShell } from "@/features/auth/AuthShell";
import { verificationEmailErrorText } from "@/features/auth/firebaseErrors";

const RESEND_WAIT_SECONDS = 60;

/** Shown when GET /auth/me returns EMAIL_NOT_VERIFIED. */
export function CheckEmailPage() {
  const { firebaseUser, recheckVerification, signOut } = useAuth();
  const email = firebaseUser?.email ?? "your email";
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Counts the resend wait down by one each second.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  async function onVerified() {
    setChecking(true);
    setCheckError(null);
    try {
      // When verified, the status changes and RequireAuth shows the app instead of this page.
      if (!(await recheckVerification())) setCheckError("Your email isn't verified yet. Open the link in the email, then try again.");
    } catch {
      setCheckError("Couldn't check right now. Try again.");
    } finally {
      setChecking(false);
    }
  }

  async function onResend() {
    if (!firebaseUser) return;
    setSending(true);
    try {
      await sendEmailVerification(firebaseUser);
      toast.success(`Verification email sent to ${email}`);
      setSecondsLeft(RESEND_WAIT_SECONDS);
    } catch (err) {
      toast.error(verificationEmailErrorText(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthShell title="Check your email">
      <Body>
        We sent a verification link to <strong>{email}</strong>. Open it, then come back here.
      </Body>
      {checkError && <InlineError title={checkError} />}
      <div className="flex flex-col gap-3">
        <Button variant="primary" size="lg" block disabled={checking} onClick={() => void onVerified()}>
          {checking ? "Checking..." : "I've verified"}
        </Button>
        <Button block disabled={sending || secondsLeft > 0} onClick={() => void onResend()}>
          {secondsLeft > 0 ? `Resend email (${secondsLeft}s)` : sending ? "Sending..." : "Resend email"}
        </Button>
        <Button variant="ghost" block onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </AuthShell>
  );
}
