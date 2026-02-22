import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AuthLayoutShell } from "@/components/auth/auth-layout-shell";
import { isSessionEmailVerified } from "@/components/auth/session-state";
import { resolveAppEntryDestination } from "@/lib/app-entry";
import { activeOrganizationQueryOptions, sessionQueryOptions } from "@/lib/session-query";

const AuthLayoutRoute = () => (
  <AuthLayoutShell>
    <Outlet />
  </AuthLayoutShell>
);

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());
    const emailVerified = isSessionEmailVerified(session);
    const activeOrganization =
      session.authenticated && emailVerified
        ? await context.queryClient.ensureQueryData(activeOrganizationQueryOptions())
        : null;
    const destination = resolveAppEntryDestination({
      activeOrganizationSlug: activeOrganization?.slug ?? null,
      authenticated: session.authenticated,
      emailVerified,
    });

    if (destination.to !== "/login") {
      throw redirect(destination);
    }
  },
  component: AuthLayoutRoute,
});
