import { Link, createFileRoute, redirect, useLoaderData } from "@tanstack/react-router";

import { AuthStatus } from "@/components/auth/auth-status";
import { getSessionEmail, isSessionEmailVerified } from "@/components/auth/session-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sessionQueryOptions } from "@/lib/session-query";

const OnboardingPage = () => {
  const session = useLoaderData({ from: "/onboarding" });
  const email = getSessionEmail(session);
  const emailVerified = isSessionEmailVerified(session);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <Card className="border-border/70 shadow-lg">
        <CardHeader className="space-y-3">
          <Badge className="w-fit" variant={emailVerified ? "default" : "secondary"}>
            {emailVerified ? "Email verified" : "Email verification pending"}
          </Badge>
          <CardTitle className="text-2xl">Onboarding</CardTitle>
          <CardDescription>
            You are signed in{email ? ` as ${email}` : ""}. Verify your email before opening an
            organization workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!emailVerified ? (
            <AuthStatus
              state={{
                description:
                  "Check your inbox and confirm your email address. Organization routes stay locked until verification is complete.",
                title: "Action required",
                variant: "destructive",
              }}
            />
          ) : (
            <AuthStatus
              state={{
                description:
                  "Your account is ready. Enter your organization slug below to continue.",
                title: "You can continue",
              }}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="org-slug-preview">Organization slug example</Label>
            <Input defaultValue="acme" id="org-slug-preview" readOnly />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button render={<Link to="/org/$slug" params={{ slug: "acme" }} />}>
              Open /org/acme
            </Button>
            <Button render={<Link to="/" />} variant="outline">
              Back home
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());

    if (!session.authenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: OnboardingPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(sessionQueryOptions()),
});
