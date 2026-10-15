import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft } from "lucide-react";
import { Body, Button, Input } from "@/components/atoms";
import { FormField, InlineError } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { auth } from "@/lib/firebase";
import { AuthShell } from "@/features/auth/AuthShell";
import { resetEmailErrorText } from "@/features/auth/firebaseErrors";
import { textLink } from "@/features/shared/linkClass";

const schema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email.")),
});

function BackToSignIn() {
  return (
    <Link to="/login" className={cn("inline-flex items-center gap-1.5 self-start", textLink)}>
      <ArrowLeft size={16} strokeWidth={1.5} />
      Back to sign in
    </Link>
  );
}

/** /forgot-password: sends the Firebase reset email. Firebase hosts the "choose a new password" page. */
export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "" }, mode: "onTouched" });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSentTo(email);
    } catch (err) {
      const text = resetEmailErrorText(err);
      if (text === null) setSentTo(email);
      else setFormError(text);
    }
  });

  if (sentTo) {
    return (
      <AuthShell title="Forgot your password?">
        <Body>
          Reset link sent to <strong>{sentTo}</strong>. Check spam if it doesn't arrive in 2 minutes.
        </Body>
        <BackToSignIn />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot your password?" description="Enter your email and we'll send a reset link.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="username" {...register("email")} />
        </FormField>
        {formError && <InlineError title={formError} />}
        <Button type="submit" variant="primary" size="lg" block disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      <BackToSignIn />
    </AuthShell>
  );
}
