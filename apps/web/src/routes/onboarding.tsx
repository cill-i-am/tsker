import { useQuery } from "@tanstack/react-query";
import {
  Link,
  createFileRoute,
  redirect,
  useLoaderData,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthStatus } from "@/components/auth/auth-status";
import type { AuthStatusState } from "@/components/auth/auth-status";
import {
  getPendingInvitations,
  resolveCreateOrganizationSlug,
} from "@/components/auth/organization-onboarding";
import { getSessionEmail, isSessionEmailVerified } from "@/components/auth/session-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { sessionQueryOptions } from "@/lib/session-query";

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

interface InvitationSummary {
  email?: string;
  id: string;
  organizationName?: string;
  organizationSlug?: string;
  role?: string;
  status?: string;
}

interface AuthActionResult {
  data: unknown;
  error: unknown;
}

interface OrganizationActionClient {
  activeOrganization: () => Promise<AuthActionResult>;
  acceptInvitation: (input: { invitationId: string }) => Promise<AuthActionResult>;
  createOrganization: (input: { name: string; slug: string }) => Promise<AuthActionResult>;
  listOrganizations: () => Promise<AuthActionResult>;
  listUserInvitations: () => Promise<AuthActionResult>;
  setActiveOrganization: (input: { organizationId: string }) => Promise<AuthActionResult>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringValue = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === "string" ? value : null;
};

const toOrganizationSummary = (value: unknown): OrganizationSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = getStringValue(value, "id");
  const name = getStringValue(value, "name");
  const slug = getStringValue(value, "slug");

  if (!id || !name || !slug) {
    return null;
  }

  return { id, name, slug };
};

const toInvitationSummary = (value: unknown): InvitationSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = getStringValue(value, "id");

  if (!id) {
    return null;
  }

  return {
    email: getStringValue(value, "email") ?? undefined,
    id,
    organizationName: getStringValue(value, "organizationName") ?? undefined,
    organizationSlug: getStringValue(value, "organizationSlug") ?? undefined,
    role: getStringValue(value, "role") ?? undefined,
    status: getStringValue(value, "status") ?? undefined,
  };
};

const toOrganizationList = (value: unknown): OrganizationSummary[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(toOrganizationSummary)
    .filter((item): item is OrganizationSummary => item !== null);
};

const toInvitationList = (value: unknown): InvitationSummary[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(toInvitationSummary).filter((item): item is InvitationSummary => item !== null);
};

const getErrorMessage = (value: unknown, fallback: string): string => {
  if (!isRecord(value)) {
    return fallback;
  }

  return getStringValue(value, "message") ?? fallback;
};

const getEmailVerificationRequiredStatus = (description: string): AuthStatusState => ({
  description,
  title: "Email verification required",
  variant: "destructive",
});

const getActionFailureStatus = (title: string, description: string): AuthStatusState => ({
  description,
  title,
  variant: "destructive",
});

const getOrganizationActionLabel = (isSwitching: boolean, isActive: boolean): string => {
  if (isSwitching) {
    return "Opening...";
  }

  if (isActive) {
    return "Open workspace";
  }

  return "Set active";
};

const requireVerifiedEmail = (
  emailVerified: boolean,
  setStatus: (value: AuthStatusState | null) => void,
  description: string,
): boolean => {
  if (emailVerified) {
    return true;
  }

  setStatus(getEmailVerificationRequiredStatus(description));
  return false;
};

const runOrganizationAction = async (
  action: () => Promise<AuthActionResult>,
  setStatus: (value: AuthStatusState | null) => void,
  onErrorTitle: string,
  onErrorFallback: string,
  onSuccess: (data: unknown) => Promise<void>,
) => {
  setStatus(null);
  const result = await action().catch((error: unknown) => {
    const description = error instanceof Error ? error.message : onErrorFallback;
    setStatus(getActionFailureStatus(onErrorTitle, description));
    return null;
  });

  if (!result) {
    return;
  }

  if (result.error) {
    setStatus(getActionFailureStatus(onErrorTitle, getErrorMessage(result.error, onErrorFallback)));
    return;
  }

  await onSuccess(result.data);
};

const useOrganizationData = (organizationActionClient: OrganizationActionClient) => {
  const listOrganizations = authClient.useListOrganizations();
  const activeOrganization = authClient.useActiveOrganization();
  const listUserInvitations = useQuery({
    queryFn: async () => {
      const result = await organizationActionClient.listUserInvitations();

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
    queryKey: ["auth", "organization", "user-invitations"],
    staleTime: 30_000,
  });

  const organizations = toOrganizationList(listOrganizations.data);
  const activeOrg = toOrganizationSummary(activeOrganization.data);
  const invitations = toInvitationList(listUserInvitations.data);
  const pendingInvitations = getPendingInvitations(invitations);
  const isLoading =
    listOrganizations.isPending || activeOrganization.isPending || listUserInvitations.isPending;

  const refetch = async () => {
    await Promise.all([
      listOrganizations.refetch(),
      activeOrganization.refetch(),
      listUserInvitations.refetch(),
    ]);
  };

  return {
    activeOrg,
    isLoading,
    organizations,
    pendingInvitations,
    refetch,
  };
};

const useOnboardingFormState = () => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [switchingOrganizationId, setSwitchingOrganizationId] = useState<string | null>(null);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatusState | null>(null);

  return {
    acceptingInvitationId,
    createSubmitting,
    name,
    setAcceptingInvitationId,
    setCreateSubmitting,
    setName,
    setSlug,
    setStatus,
    setSwitchingOrganizationId,
    slug,
    status,
    switchingOrganizationId,
  };
};

const createRefreshOrgData =
  (organizationActionClient: OrganizationActionClient, refetch: () => Promise<void>) =>
  async () => {
    const [organizationsResult, activeOrganizationResult, invitationsResult] = await Promise.all([
      organizationActionClient.listOrganizations(),
      organizationActionClient.activeOrganization(),
      organizationActionClient.listUserInvitations(),
    ]);

    await refetch();

    return {
      activeOrganization: toOrganizationSummary(
        activeOrganizationResult.error ? null : activeOrganizationResult.data,
      ),
      invitations: toInvitationList(invitationsResult.error ? [] : invitationsResult.data),
      organizations: toOrganizationList(organizationsResult.error ? [] : organizationsResult.data),
    };
  };

const createNavigateToOrganization =
  (navigate: ReturnType<typeof useNavigate>) => async (organizationSlug: string) => {
    await navigate({
      params: { slug: organizationSlug },
      to: "/org/$slug",
    });
  };

const createCreateOrganizationHandler =
  (
    emailVerified: boolean,
    formState: ReturnType<typeof useOnboardingFormState>,
    organizationActionClient: OrganizationActionClient,
    refreshOrgData: () => Promise<{
      activeOrganization: OrganizationSummary | null;
      invitations: InvitationSummary[];
      organizations: OrganizationSummary[];
    }>,
    navigateToOrganization: (organizationSlug: string) => Promise<void>,
  ) =>
  async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !requireVerifiedEmail(
        emailVerified,
        formState.setStatus,
        "Verify your email before creating an organization.",
      )
    ) {
      return;
    }

    const normalizedSlug = resolveCreateOrganizationSlug({
      name: formState.name,
      slug: formState.slug,
    });

    if (!normalizedSlug) {
      formState.setStatus(
        getActionFailureStatus(
          "Organization slug is required",
          "Provide a valid organization name or slug.",
        ),
      );
      return;
    }

    formState.setCreateSubmitting(true);
    await runOrganizationAction(
      () =>
        organizationActionClient.createOrganization({
          name: formState.name.trim(),
          slug: normalizedSlug,
        }),
      formState.setStatus,
      "Unable to create organization",
      "Unexpected organization creation error.",
      async (data) => {
        const createdOrganization = toOrganizationSummary(data);
        await refreshOrgData();

        if (createdOrganization?.slug) {
          await navigateToOrganization(createdOrganization.slug);
          return;
        }

        formState.setName("");
        formState.setSlug("");
        formState.setStatus({
          description: "Organization created.",
          title: "Success",
        });
      },
    );
    formState.setCreateSubmitting(false);
  };

const createSetActiveOrganizationHandler =
  (
    emailVerified: boolean,
    formState: ReturnType<typeof useOnboardingFormState>,
    organizationActionClient: OrganizationActionClient,
    refreshOrgData: () => Promise<{
      activeOrganization: OrganizationSummary | null;
      invitations: InvitationSummary[];
      organizations: OrganizationSummary[];
    }>,
    navigateToOrganization: (organizationSlug: string) => Promise<void>,
  ) =>
  async (organization: OrganizationSummary) => {
    if (
      !requireVerifiedEmail(
        emailVerified,
        formState.setStatus,
        "Verify your email before accessing organization workspaces.",
      )
    ) {
      return;
    }

    formState.setSwitchingOrganizationId(organization.id);
    await runOrganizationAction(
      () => organizationActionClient.setActiveOrganization({ organizationId: organization.id }),
      formState.setStatus,
      "Unable to set active organization",
      "Unexpected organization switch error.",
      async (data) => {
        await refreshOrgData();
        const selectedOrganization = toOrganizationSummary(data) ?? organization;
        await navigateToOrganization(selectedOrganization.slug);
      },
    );
    formState.setSwitchingOrganizationId(null);
  };

const createAcceptInvitationHandler =
  (
    emailVerified: boolean,
    formState: ReturnType<typeof useOnboardingFormState>,
    organizationActionClient: OrganizationActionClient,
    refreshOrgData: () => Promise<{
      activeOrganization: OrganizationSummary | null;
      invitations: InvitationSummary[];
      organizations: OrganizationSummary[];
    }>,
    navigateToOrganization: (organizationSlug: string) => Promise<void>,
  ) =>
  async (invitation: InvitationSummary) => {
    if (
      !requireVerifiedEmail(
        emailVerified,
        formState.setStatus,
        "Verify your email before accepting invitations.",
      )
    ) {
      return;
    }

    formState.setAcceptingInvitationId(invitation.id);
    await runOrganizationAction(
      () => organizationActionClient.acceptInvitation({ invitationId: invitation.id }),
      formState.setStatus,
      "Unable to accept invitation",
      "Unexpected invitation acceptance error.",
      async () => {
        const refreshed = await refreshOrgData();
        const targetSlug =
          refreshed.activeOrganization?.slug ||
          invitation.organizationSlug ||
          refreshed.organizations.find(
            (organization) => organization.name === invitation.organizationName,
          )?.slug;

        if (targetSlug) {
          await navigateToOrganization(targetSlug);
          return;
        }

        formState.setStatus({
          description: "Invitation accepted. Choose an organization to continue.",
          title: "Success",
        });
      },
    );
    formState.setAcceptingInvitationId(null);
  };

const useOnboardingController = (emailVerified: boolean) => {
  const navigate = useNavigate();
  const organizationActionClient = authClient as typeof authClient & OrganizationActionClient;
  const organizationData = useOrganizationData(organizationActionClient);
  const formState = useOnboardingFormState();
  const refreshOrgData = createRefreshOrgData(organizationActionClient, organizationData.refetch);
  const navigateToOrganization = createNavigateToOrganization(navigate);
  const handleCreateOrganization = createCreateOrganizationHandler(
    emailVerified,
    formState,
    organizationActionClient,
    refreshOrgData,
    navigateToOrganization,
  );
  const handleSetActiveOrganization = createSetActiveOrganizationHandler(
    emailVerified,
    formState,
    organizationActionClient,
    refreshOrgData,
    navigateToOrganization,
  );
  const handleAcceptInvitation = createAcceptInvitationHandler(
    emailVerified,
    formState,
    organizationActionClient,
    refreshOrgData,
    navigateToOrganization,
  );

  return {
    ...formState,
    ...organizationData,
    handleAcceptInvitation,
    handleCreateOrganization,
    handleSetActiveOrganization,
    navigateToOrganization,
  };
};

const OnboardingPage = () => {
  const session = useLoaderData({ from: "/onboarding" });
  const email = getSessionEmail(session);
  const emailVerified = isSessionEmailVerified(session);
  const controller = useOnboardingController(emailVerified);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <Card className="border-border/70 bg-card/95 shadow-lg backdrop-blur">
        <CardHeader className="space-y-3">
          <Badge className="w-fit" variant={emailVerified ? "default" : "secondary"}>
            {emailVerified ? "Email verified" : "Email verification pending"}
          </Badge>
          <CardTitle className="text-2xl">Choose your organization</CardTitle>
          <CardDescription>
            You are signed in{email ? ` as ${email}` : ""}. Create a workspace, accept pending
            invitations, or switch your active organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailVerified ? null : (
            <AuthStatus
              state={{
                description:
                  "Check your inbox and verify your email. Organization routes stay locked until verification is complete.",
                title: "Action required",
                variant: "destructive",
              }}
            />
          )}

          {controller.status ? <AuthStatus state={controller.status} /> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!controller.activeOrg?.slug || !emailVerified}
              onClick={async () => {
                if (controller.activeOrg?.slug) {
                  await controller.navigateToOrganization(controller.activeOrg.slug);
                }
              }}
            >
              Continue with active org
            </Button>
            <Button render={<Link to="/" />} variant="outline">
              Back to app
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 shadow-lg">
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>
              {controller.activeOrg
                ? `Current active organization: ${controller.activeOrg.name}`
                : "No active organization selected yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-4 rounded-lg border border-dashed border-border/70 p-4"
              onSubmit={controller.handleCreateOrganization}
            >
              <div className="space-y-2">
                <Label htmlFor="organization-name">Organization name</Label>
                <Input
                  id="organization-name"
                  maxLength={64}
                  onChange={(event) => controller.setName(event.target.value)}
                  placeholder="Acme"
                  required
                  value={controller.name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization-slug">Organization slug</Label>
                <Input
                  id="organization-slug"
                  maxLength={64}
                  onChange={(event) => controller.setSlug(event.target.value)}
                  placeholder="acme"
                  value={controller.slug}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and dashes. Leave blank to derive from the name.
                </p>
              </div>

              <Button
                className="w-full"
                disabled={controller.createSubmitting || controller.isLoading}
                type="submit"
              >
                {controller.createSubmitting ? "Creating organization..." : "Create organization"}
              </Button>
            </form>

            {controller.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading organizations...</p>
            ) : null}

            {controller.isLoading || controller.organizations.length > 0 ? null : (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                No organizations yet. Create one or accept an invitation to continue.
              </div>
            )}

            {controller.organizations.length === 0 ? null : (
              <ul className="space-y-3">
                {controller.organizations.map((organization) => {
                  const isActive = controller.activeOrg?.id === organization.id;
                  const isSwitching = controller.switchingOrganizationId === organization.id;

                  return (
                    <li
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3"
                      key={organization.id}
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{organization.name}</p>
                        <p className="text-xs text-muted-foreground">/{organization.slug}</p>
                        {isActive ? <Badge variant="secondary">Active</Badge> : null}
                      </div>

                      <Button
                        disabled={isSwitching || controller.isLoading || !emailVerified}
                        onClick={async () => {
                          await controller.handleSetActiveOrganization(organization);
                        }}
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                      >
                        {getOrganizationActionLabel(isSwitching, isActive)}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-lg">
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Accept invitations to join existing organizations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {controller.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading invitations...</p>
            ) : null}

            {controller.isLoading || controller.pendingInvitations.length > 0 ? null : (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                No pending invitations.
              </div>
            )}

            {controller.pendingInvitations.length === 0 ? null : (
              <ul className="space-y-3">
                {controller.pendingInvitations.map((invitation) => {
                  const isAccepting = controller.acceptingInvitationId === invitation.id;

                  return (
                    <li
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3"
                      key={invitation.id}
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          {invitation.organizationName ?? "Organization invitation"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Role: {invitation.role ?? "member"}
                          {invitation.email ? ` • ${invitation.email}` : ""}
                        </p>
                      </div>

                      <Button
                        disabled={isAccepting || controller.isLoading || !emailVerified}
                        onClick={async () => {
                          await controller.handleAcceptInvitation(invitation);
                        }}
                        size="sm"
                      >
                        {isAccepting ? "Accepting..." : "Accept invitation"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
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
