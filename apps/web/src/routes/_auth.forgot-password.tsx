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

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("dev@localtest.me");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<AuthStatusState | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
      const result = await requestPasswordReset({
        email,
        redirectTo,
      });

      if (result.status >= 200 && result.status < 300) {
        setStatus({
          description: "If the account exists, a reset link has been sent to your inbox.",
          title: "Reset email sent",
        });
        return;
      }

      setStatus({
        description: "We could not send a reset link. Check the email and try again.",
        title: "Reset request failed",
        variant: "destructive",
      });
    } catch (error) {
      setStatus({
        description: error instanceof Error ? error.message : "Unexpected reset request error.",
        title: "Reset request failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
