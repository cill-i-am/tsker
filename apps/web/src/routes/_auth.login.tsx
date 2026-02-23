import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthStatus } from "@/components/auth/auth-status";
import type { AuthStatusState } from "@/components/auth/auth-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInEmail } from "@/lib/auth-client";
import { sessionQueryOptions } from "@/lib/session-query";

const isSuccessfulStatus = (status: number) => status >= 200 && status < 300;

const getErrorMessage = (payload: unknown): string => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const { message } = payload;

    return typeof message === "string" ? message : "Sign in failed.";
  }

  return "Sign in failed.";
};

const runWithSubmitting = async (
  setIsSubmitting: (value: boolean) => void,
  operation: () => Promise<void>,
) => {
  setIsSubmitting(true);

  try {
    await operation();
  } finally {
    setIsSubmitting(false);
  }
};

const setSignInFailureStatus = (
  setStatus: (value: AuthStatusState | null) => void,
  description: string,
) => {
  setStatus({
    description,
    title: "Unable to sign in",
    variant: "destructive",
  });
};

const refreshSessionAndNavigate = async (
  queryClient: ReturnType<typeof useQueryClient>,
  navigate: ReturnType<typeof useNavigate>,
) => {
  const sessionOptions = sessionQueryOptions();
  await queryClient.invalidateQueries({ queryKey: sessionOptions.queryKey });
  await queryClient.fetchQuery(sessionOptions);
  await navigate({ to: "/onboarding" });
};

const LoginPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("dev@localtest.me");
  const [password, setPassword] = useState("password123!");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<AuthStatusState | null>(null);

  const submitSignIn = async () => {
    setStatus(null);

    const result = await signInEmail({ email, password }).catch((error: unknown) => {
      const description = error instanceof Error ? error.message : "Unexpected sign in error.";
      setSignInFailureStatus(setStatus, description);
      return null;
    });

    if (!result) {
      return;
    }

    if (isSuccessfulStatus(result.status)) {
      await refreshSessionAndNavigate(queryClient, navigate);
      return;
    }

    setSignInFailureStatus(setStatus, getErrorMessage(result.body));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithSubmitting(setIsSubmitting, submitSignIn);
  };

  return (
    <AuthCard
      title="Sign in to tsker"
      description="Use your account credentials to access onboarding and your organization workspace."
      footer={
        <p>
          New to tsker?{" "}
          <Link to="/signup" className="font-medium text-foreground underline underline-offset-3">
            Create an account
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-3 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            autoComplete="current-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Sign in"}
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

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
});
