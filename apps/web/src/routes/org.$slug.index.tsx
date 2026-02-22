import { Link, createFileRoute, redirect, useLoaderData } from "@tanstack/react-router";

import { getSessionEmail, isSessionEmailVerified } from "@/components/auth/session-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sessionQueryOptions } from "@/lib/session-query";

const OrgIndexPage = () => {
  const { slug } = Route.useParams();
  const session = useLoaderData({ from: "/org/$slug/" });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Card className="border-border/70 shadow-lg">
        <CardHeader className="space-y-3">
          <Badge className="w-fit">Organization</Badge>
          <CardTitle className="text-2xl">/{slug}</CardTitle>
          <CardDescription>
            Authenticated workspace for {getSessionEmail(session) ?? "current account"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Email verification: {isSessionEmailVerified(session) ? "complete" : "pending"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link to="/onboarding" />} variant="outline">
              Back to onboarding
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

export const Route = createFileRoute("/org/$slug/")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());

    if (!session.authenticated) {
      throw redirect({ to: "/login" });
    }

    if (!isSessionEmailVerified(session)) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: OrgIndexPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(sessionQueryOptions()),
});
