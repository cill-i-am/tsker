import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AuthLayoutShell } from "@/components/auth/auth-layout-shell";
import { sessionQueryOptions } from "@/lib/session-query";

const AuthLayoutRoute = () => (
  <AuthLayoutShell>
    <Outlet />
  </AuthLayoutShell>
);

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());

    if (session.authenticated) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: AuthLayoutRoute,
});
