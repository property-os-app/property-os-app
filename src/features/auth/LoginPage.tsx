import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Checkbox, Input } from "@/components/atoms";
import { FormField, InlineError } from "@/components/molecules";
import { useAuth } from "@/features/auth/authContext";
import { AuthShell } from "@/features/auth/AuthShell";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { signInErrorText } from "@/features/auth/firebaseErrors";
import { textLink } from "@/features/shared/linkClass";

const schema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email.")),
  password: z.string().min(1, "Enter your password."),
  keepSignedIn: z.boolean(),
});

/** /login: email + password sign-in. PublicOnly redirects to "next" once signed in. */
export function LoginPage() {
  const { signIn, notice } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", keepSignedIn: true },
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password, values.keepSignedIn);
    } catch (err) {
      setFormError(signInErrorText(err));
    }
  });

  const message = formError ?? notice;

  return (
    <AuthShell title="Sign in" description="For property owners and managers.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="username" {...register("email")} />
        </FormField>
        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          action={
            <Link to="/forgot-password" className={textLink}>
              Forgot password?
            </Link>
          }
        >
          <PasswordInput id="password" autoComplete="current-password" {...register("password")} />
        </FormField>
        <Checkbox label="Keep me signed in" {...register("keepSignedIn")} />
        {message && <InlineError title={message} />}
        <Button type="submit" variant="primary" size="lg" block disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
