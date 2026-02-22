import { Link, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthStatus } from "@/components/auth/auth-status";
import type { AuthStatusState } from "@/components/auth/auth-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth-client";

interface ResetPasswordSearch {
  token?: string;
}

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

const setResetFailureStatus = (
  setStatus: (value: AuthStatusState | null) => void,
  description: string,
) => {
  setStatus({
    description,
    title: "Password reset failed",
    variant: "destructive",
  });
};

const getValidationError = (token: string, password: string, confirmPassword: string) => {
  if (!token) {
    return {
      description: "Paste the token from your email reset link before continuing.",
      title: "Reset token required",
      variant: "destructive",
    } satisfies AuthStatusState;
  }

  if (password !== confirmPassword) {
    return {
      description: "Passwords do not match. Enter matching values and try again.",
      title: "Password mismatch",
      variant: "destructive",
    } satisfies AuthStatusState;
  }

  return null;
};

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_auth/reset-password" });
  const [token, setToken] = useState(search.token ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<AuthStatusState | null>(null);

  const submitPasswordReset = async () => {
    setStatus(null);
    const result = await resetPassword({
      newPassword: password,
      token,
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected password reset error.";
      setResetFailureStatus(setStatus, message);
      return null;
    });

    if (!result) {
      return;
    }

    if (isSuccessfulStatus(result.status)) {
      setStatus({
        description: "Your password was updated. You can now sign in with the new password.",
        title: "Password reset complete",
      });
      await navigate({ to: "/login" });
      return;
    }

    setResetFailureStatus(
      setStatus,
      "The reset link may be invalid or expired. Request a new one and retry.",
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = getValidationError(token, password, confirmPassword);

    if (validationError) {
      setStatus(validationError);
      return;
    }

    await runWithSubmitting(setIsSubmitting, submitPasswordReset);
  };

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the reset token and set a fresh password to secure your account."
      footer={
        <p>
          Need another link?{" "}
          <Link
            to="/forgot-password"
            className="font-medium text-foreground underline underline-offset-3"
          >
            Request a new reset email
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="reset-token">Reset token</Label>
          <Input
            id="reset-token"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            autoComplete="new-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password">Confirm new password</Label>
          <Input
            id="reset-confirm-password"
            autoComplete="new-password"
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Resetting password..." : "Reset password"}
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

export const Route = createFileRoute("/_auth/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
});
