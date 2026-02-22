import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { type AuthStatusState, AuthStatus } from "@/components/auth/auth-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpEmail } from "@/lib/auth-api";
import { sessionQueryOptions } from "@/lib/session-query";

const getErrorMessage = (payload: unknown): string => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = payload.message;

    return typeof message === "string" ? message : "Sign up failed.";
  }

  return "Sign up failed.";
};

const SignUpPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("Local User");
  const [email, setEmail] = useState("dev@localtest.me");
  const [password, setPassword] = useState("password123!");
  const [confirmPassword, setConfirmPassword] = useState("password123!");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<AuthStatusState | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setStatus({
        description: "Passwords do not match. Enter matching values and try again.",
        title: "Password mismatch",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const result = await signUpEmail({ email, name, password });

      if (result.status >= 200 && result.status < 300) {
        const sessionOptions = sessionQueryOptions();
        await queryClient.invalidateQueries({ queryKey: sessionOptions.queryKey });
        const refreshedSession = await queryClient.fetchQuery(sessionOptions);
        await navigate({ to: refreshedSession.authenticated ? "/onboarding" : "/login" });
        return;
      }

      setStatus({
        description: getErrorMessage(result.body),
        title: "Unable to create account",
        variant: "destructive",
      });
    } catch (error) {
      setStatus({
        description: error instanceof Error ? error.message : "Unexpected sign up error.",
        title: "Unable to create account",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      description="Set up your credentials to access onboarding and join an organization."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-3">
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="signup-name">Name</Label>
          <Input
            id="signup-name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            autoComplete="new-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm-password">Confirm password</Label>
          <Input
            id="signup-confirm-password"
            autoComplete="new-password"
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {status ? (
        <div className="mt-4">
          <AuthStatus state={status} />
        </div>
      ) : null}
    </AuthCard>
  );
};

export const Route = createFileRoute("/_auth/signup")({
  component: SignUpPage,
});
