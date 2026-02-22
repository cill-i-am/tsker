import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { isSessionEmailVerified } from "@/components/auth/session-state";
import { sessionQueryOptions } from "@/lib/session-query";

const OrgLayoutPage = () => <Outlet />;

export const Route = createFileRoute("/org/$slug")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());

    if (!session.authenticated) {
      throw redirect({ to: "/login" });
    }

    if (!isSessionEmailVerified(session)) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: OrgLayoutPage,
});
