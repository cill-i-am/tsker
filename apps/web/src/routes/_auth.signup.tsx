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
import { signUpEmail } from "@/lib/auth-client";
import { sessionQueryOptions } from "@/lib/session-query";

const isSuccessfulStatus = (status: number) => status >= 200 && status < 300;

const getErrorMessage = (payload: unknown): string => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const { message } = payload;

    return typeof message === "string" ? message : "Sign up failed.";
  }

  return "Sign up failed.";
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

const setSignUpFailureStatus = (
  setStatus: (value: AuthStatusState | null) => void,
  description: string,
) => {
  setStatus({
    description,
    title: "Unable to create account",
    variant: "destructive",
  });
};

const setPasswordMismatchStatus = (setStatus: (value: AuthStatusState | null) => void) => {
  setStatus({
    description: "Passwords do not match. Enter matching values and try again.",
    title: "Password mismatch",
    variant: "destructive",
  });
};

const refreshSessionAndNavigate = async (
  queryClient: ReturnType<typeof useQueryClient>,
  navigate: ReturnType<typeof useNavigate>,
) => {
  const sessionOptions = sessionQueryOptions();
  await queryClient.invalidateQueries({ queryKey: sessionOptions.queryKey });
  const refreshedSession = await queryClient.fetchQuery(sessionOptions);
  await navigate({ to: refreshedSession.authenticated ? "/onboarding" : "/login" });
};

interface SignUpFormValues {
  confirmPassword: string;
  email: string;
  name: string;
  password: string;
}

const defaultSignUpFormValues: SignUpFormValues = {
  confirmPassword: "password123!",
  email: "dev@localtest.me",
  name: "Local User",
  password: "password123!",
};

const hasPasswordMismatch = (
  formValues: SignUpFormValues,
  setStatus: (value: AuthStatusState | null) => void,
) => {
  if (formValues.password === formValues.confirmPassword) {
    return false;
  }

  setPasswordMismatchStatus(setStatus);
  return true;
};

const submitSignUpRequest = async (
  formValues: SignUpFormValues,
  setStatus: (value: AuthStatusState | null) => void,
) => {
  try {
    return await signUpEmail({
      email: formValues.email,
      name: formValues.name,
      password: formValues.password,
    });
  } catch (error: unknown) {
    const description = error instanceof Error ? error.message : "Unexpected sign up error.";
    setSignUpFailureStatus(setStatus, description);
    return null;
  }
};

const handleSignUpResult = async (
  result: { body: unknown; status: number },
  queryClient: ReturnType<typeof useQueryClient>,
  navigate: ReturnType<typeof useNavigate>,
  setStatus: (value: AuthStatusState | null) => void,
) => {
  if (isSuccessfulStatus(result.status)) {
    await refreshSessionAndNavigate(queryClient, navigate);
    return;
  }

  setSignUpFailureStatus(setStatus, getErrorMessage(result.body));
};

const SignUpPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<SignUpFormValues>(defaultSignUpFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<AuthStatusState | null>(null);

  const updateFormValue = (key: keyof SignUpFormValues, value: string) => {
    setFormValues((current) => ({ ...current, [key]: value }));
  };

  const submitSignUp = async () => {
    if (hasPasswordMismatch(formValues, setStatus)) {
      return;
    }

    setStatus(null);
    const result = await submitSignUpRequest(formValues, setStatus);

    if (!result) {
      return;
    }

    await handleSignUpResult(result, queryClient, navigate, setStatus);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithSubmitting(setIsSubmitting, submitSignUp);
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
            value={formValues.name}
            onChange={(event) => updateFormValue("name", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            autoComplete="email"
            required
            type="email"
            value={formValues.email}
            onChange={(event) => updateFormValue("email", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            autoComplete="new-password"
            required
            type="password"
            value={formValues.password}
            onChange={(event) => updateFormValue("password", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm-password">Confirm password</Label>
          <Input
            id="signup-confirm-password"
            autoComplete="new-password"
            required
            type="password"
            value={formValues.confirmPassword}
            onChange={(event) => updateFormValue("confirmPassword", event.target.value)}
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
