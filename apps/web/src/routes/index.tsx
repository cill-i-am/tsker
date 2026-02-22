import { createFileRoute, redirect } from "@tanstack/react-router";

import { isSessionEmailVerified } from "@/components/auth/session-state";
import { resolveAppEntryDestination } from "@/lib/app-entry";
import { activeOrganizationQueryOptions, sessionQueryOptions } from "@/lib/session-query";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());
    const emailVerified = isSessionEmailVerified(session);
    const activeOrganization =
      session.authenticated && emailVerified
        ? await context.queryClient.ensureQueryData(activeOrganizationQueryOptions())
        : null;

    throw redirect(
      resolveAppEntryDestination({
        activeOrganizationSlug: activeOrganization?.slug ?? null,
        authenticated: session.authenticated,
        emailVerified,
      }),
    );
  },
  component: () => null,
});
