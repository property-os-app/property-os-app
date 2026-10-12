import { InlineError } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useAuth } from "@/features/auth/authContext";

/** Shown when GET /auth/me fails for another reason (server down, 500). Does not sign out. */
export function AuthErrorPage() {
  const { error, retry } = useAuth();
  useDocumentTitle("Error");
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <InlineError className="w-full max-w-[520px]" title="We couldn't load your account" description={errorText(error)} onRetry={() => void retry()} />
    </div>
  );
}
