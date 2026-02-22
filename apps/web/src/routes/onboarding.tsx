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

  const organizations: OrganizationSummary[] = [];

  for (const item of value) {
    const organization = toOrganizationSummary(item);

    if (organization) {
      organizations.push(organization);
    }
  }

  return organizations;
};

const toInvitationList = (value: unknown): InvitationSummary[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const invitations: InvitationSummary[] = [];

  for (const item of value) {
    const invitation = toInvitationSummary(item);

    if (invitation) {
      invitations.push(invitation);
    }
  }

  return invitations;
};

const getErrorMessage = (value: unknown, fallback: string): string => {
  if (!isRecord(value)) {
    return fallback;
  }

  const message = getStringValue(value, "message");
  return message ?? fallback;
};

const OnboardingPage = () => {
  const session = useLoaderData({ from: "/onboarding" });
  const navigate = useNavigate();
  const email = getSessionEmail(session);
  const emailVerified = isSessionEmailVerified(session);

  const listOrganizations = authClient.useListOrganizations();
  const activeOrganization = authClient.useActiveOrganization();
  const organizationActionClient = authClient as typeof authClient & OrganizationActionClient;
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

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [switchingOrganizationId, setSwitchingOrganizationId] = useState<string | null>(null);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatusState | null>(null);

  const isLoading =
    listOrganizations.isPending || activeOrganization.isPending || listUserInvitations.isPending;

  const refreshOrgData = async (): Promise<{
    activeOrganization: OrganizationSummary | null;
    invitations: InvitationSummary[];
    organizations: OrganizationSummary[];
  }> => {
    const [organizationsResult, activeOrganizationResult, invitationsResult] = await Promise.all([
      organizationActionClient.listOrganizations(),
      organizationActionClient.activeOrganization(),
      organizationActionClient.listUserInvitations(),
    ]);

    await Promise.all([
      listOrganizations.refetch(),
      activeOrganization.refetch(),
      listUserInvitations.refetch(),
    ]);

    return {
      activeOrganization: toOrganizationSummary(
        activeOrganizationResult.error ? null : activeOrganizationResult.data,
      ),
      invitations: toInvitationList(invitationsResult.error ? [] : invitationsResult.data),
      organizations: toOrganizationList(organizationsResult.error ? [] : organizationsResult.data),
    };
  };

  const navigateToOrganization = async (organizationSlug: string) => {
    await navigate({
      params: { slug: organizationSlug },
      to: "/org/$slug",
    });
  };

  const handleCreateOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!emailVerified) {
      setStatus({
        description: "Verify your email before creating an organization.",
        title: "Email verification required",
        variant: "destructive",
      });
      return;
    }

    const normalizedSlug = resolveCreateOrganizationSlug({ name, slug });

    if (!normalizedSlug) {
      setStatus({
        description: "Provide a valid organization name or slug.",
        title: "Organization slug is required",
        variant: "destructive",
      });
      return;
    }

    setCreateSubmitting(true);
    setStatus(null);

    try {
      const result = await organizationActionClient.createOrganization({
        name: name.trim(),
        slug: normalizedSlug,
      });

      if (result.error) {
        setStatus({
          description: getErrorMessage(result.error, "Organization creation failed."),
          title: "Unable to create organization",
          variant: "destructive",
        });
        return;
      }

      const createdOrganization = toOrganizationSummary(result.data);
      await refreshOrgData();

      if (createdOrganization?.slug) {
        await navigateToOrganization(createdOrganization.slug);
        return;
      }

      setName("");
      setSlug("");
      setStatus({
        description: "Organization created.",
        title: "Success",
      });
    } catch (error) {
      setStatus({
        description:
          error instanceof Error ? error.message : "Unexpected organization creation error.",
        title: "Unable to create organization",
        variant: "destructive",
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleSetActiveOrganization = async (organization: OrganizationSummary) => {
    if (!emailVerified) {
      setStatus({
        description: "Verify your email before accessing organization workspaces.",
        title: "Email verification required",
        variant: "destructive",
      });
      return;
    }

    setSwitchingOrganizationId(organization.id);
    setStatus(null);

    try {
      const result = await organizationActionClient.setActiveOrganization({
        organizationId: organization.id,
      });

      if (result.error) {
        setStatus({
          description: getErrorMessage(result.error, "Failed to set active organization."),
          title: "Unable to set active organization",
          variant: "destructive",
        });
        return;
      }

      await refreshOrgData();
      const selectedOrganization = toOrganizationSummary(result.data) ?? organization;
      await navigateToOrganization(selectedOrganization.slug);
    } catch (error) {
      setStatus({
        description:
          error instanceof Error ? error.message : "Unexpected organization switch error.",
        title: "Unable to set active organization",
        variant: "destructive",
      });
    } finally {
      setSwitchingOrganizationId(null);
    }
  };

  const handleAcceptInvitation = async (invitation: InvitationSummary) => {
    if (!emailVerified) {
      setStatus({
        description: "Verify your email before accepting invitations.",
        title: "Email verification required",
        variant: "destructive",
      });
      return;
    }

    setAcceptingInvitationId(invitation.id);
    setStatus(null);

    try {
      const result = await organizationActionClient.acceptInvitation({
        invitationId: invitation.id,
      });

      if (result.error) {
        setStatus({
          description: getErrorMessage(result.error, "Invitation could not be accepted."),
          title: "Unable to accept invitation",
          variant: "destructive",
        });
        return;
      }

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

      setStatus({
        description: "Invitation accepted. Choose an organization to continue.",
        title: "Success",
      });
    } catch (error) {
      setStatus({
        description:
          error instanceof Error ? error.message : "Unexpected invitation acceptance error.",
        title: "Unable to accept invitation",
        variant: "destructive",
      });
    } finally {
      setAcceptingInvitationId(null);
    }
  };

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
          {!emailVerified ? (
            <AuthStatus
              state={{
                description:
                  "Check your inbox and verify your email. Organization routes stay locked until verification is complete.",
                title: "Action required",
                variant: "destructive",
              }}
            />
          ) : null}

          {status ? <AuthStatus state={status} /> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!activeOrg?.slug || !emailVerified}
              onClick={() => {
                if (activeOrg?.slug) {
                  void navigateToOrganization(activeOrg.slug);
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
              {activeOrg
                ? `Current active organization: ${activeOrg.name}`
                : "No active organization selected yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-4 rounded-lg border border-dashed border-border/70 p-4"
              onSubmit={handleCreateOrganization}
            >
              <div className="space-y-2">
                <Label htmlFor="organization-name">Organization name</Label>
                <Input
                  id="organization-name"
                  maxLength={64}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Acme"
                  required
                  value={name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization-slug">Organization slug</Label>
                <Input
                  id="organization-slug"
                  maxLength={64}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="acme"
                  value={slug}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and dashes. Leave blank to derive from the name.
                </p>
              </div>

              <Button className="w-full" disabled={createSubmitting || isLoading} type="submit">
                {createSubmitting ? "Creating organization..." : "Create organization"}
              </Button>
            </form>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading organizations...</p>
            ) : null}

            {!isLoading && organizations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                No organizations yet. Create one or accept an invitation to continue.
              </div>
            ) : null}

            {organizations.length > 0 ? (
              <ul className="space-y-3">
                {organizations.map((organization) => {
                  const isActive = activeOrg?.id === organization.id;
                  const isSwitching = switchingOrganizationId === organization.id;

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
                        disabled={isSwitching || isLoading || !emailVerified}
                        onClick={() => {
                          void handleSetActiveOrganization(organization);
                        }}
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                      >
                        {isSwitching ? "Opening..." : isActive ? "Open workspace" : "Set active"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-lg">
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Accept invitations to join existing organizations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading invitations...</p>
            ) : null}

            {!isLoading && pendingInvitations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                No pending invitations.
              </div>
            ) : null}

            {pendingInvitations.length > 0 ? (
              <ul className="space-y-3">
                {pendingInvitations.map((invitation) => {
                  const isAccepting = acceptingInvitationId === invitation.id;

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
                        disabled={isAccepting || isLoading || !emailVerified}
                        onClick={() => {
                          void handleAcceptInvitation(invitation);
                        }}
                        size="sm"
                      >
                        {isAccepting ? "Accepting..." : "Accept invitation"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
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
