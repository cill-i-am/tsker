import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthStatus } from "@/components/auth/auth-status";
import type { AuthStatusState } from "@/components/auth/auth-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-client";

const isSuccessfulStatus = (status: number) => status >= 200 && status < 300;

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

const setResetRequestFailure = (
  setStatus: (value: AuthStatusState | null) => void,
  message: string,
) => {
  setStatus({
    description: message,
    title: "Reset request failed",
    variant: "destructive",
  });
};

const getResetPasswordRedirectTo = () =>
  typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`;

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("dev@localtest.me");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<AuthStatusState | null>(null);

  const submitResetRequest = async () => {
    setStatus(null);
    const result = await requestPasswordReset({
      email,
      redirectTo: getResetPasswordRedirectTo(),
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected reset request error.";
      setResetRequestFailure(setStatus, message);
      return null;
    });

    if (!result) {
      return;
    }

    if (isSuccessfulStatus(result.status)) {
      setStatus({
        description: "If the account exists, a reset link has been sent to your inbox.",
        title: "Reset email sent",
      });
      return;
    }

    setResetRequestFailure(
      setStatus,
      "We could not send a reset link. Check the email and try again.",
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithSubmitting(setIsSubmitting, submitResetRequest);
  };

  return (
    <AuthCard
      title="Forgot your password?"
      description="Request a password reset link and continue with a secure token."
      footer={
        <p>
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-3">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Account email</Label>
          <Input
            id="forgot-email"
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending reset link..." : "Send reset link"}
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

export const Route = createFileRoute("/_auth/forgot-password")({
  component: ForgotPasswordPage,
});
