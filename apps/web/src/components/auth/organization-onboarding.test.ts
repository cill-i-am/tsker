// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import type { ComponentType, ReactNode } from "react";

import {
  getPendingInvitations,
  normalizeOrganizationSlug,
  resolveCreateOrganizationSlug,
} from "./organization-onboarding";

const routeOptionsByPath = vi.hoisted(() => new Map<string, Record<string, unknown>>());

const {
  acceptInvitationMock,
  activeOrganizationMock,
  createOrganizationMock,
  listOrganizationsMock,
  listUserInvitationsMock,
  loaderSessionState,
  navigateMock,
  setActiveOrganizationMock,
  useActiveOrganizationMock,
  useListOrganizationsMock,
  useQueryMock,
} = vi.hoisted(() => ({
  acceptInvitationMock: vi.fn(),
  activeOrganizationMock: vi.fn(),
  createOrganizationMock: vi.fn(),
  listOrganizationsMock: vi.fn(),
  listUserInvitationsMock: vi.fn(),
  loaderSessionState: {
    value: {
      authenticated: true,
      payload: {
        user: {
          email: "owner@example.com",
          emailVerified: true,
        },
      },
      status: 200,
    },
  },
  navigateMock: vi.fn(),
  setActiveOrganizationMock: vi.fn(),
  useActiveOrganizationMock: vi.fn(),
  useListOrganizationsMock: vi.fn(),
  useQueryMock: vi.fn(),
}));

vi.mock<Record<string, unknown>>(import("@tanstack/react-router"), async () => {
  const React = await import("react");

  return {
    Link: ({ children }: { children?: ReactNode }) => React.createElement("a", null, children),
    createFileRoute: (path: string) => (options: Record<string, unknown>) => {
      routeOptionsByPath.set(path, options);

      return {
        options,
        useParams: () => ({ slug: "test-org" }),
      };
    },
    redirect: (value: unknown) => value,
    useLoaderData: () => loaderSessionState.value,
    useNavigate: () => navigateMock,
  };
});

vi.mock<Record<string, unknown>>(import("@tanstack/react-query"), () => ({
  useQuery: (input: unknown) => useQueryMock(input),
}));

vi.mock<Record<string, unknown>>(import("@/lib/auth-client"), () => ({
  authClient: {
    acceptInvitation: (input: unknown) => acceptInvitationMock(input),
    activeOrganization: () => activeOrganizationMock(),
    createOrganization: (input: unknown) => createOrganizationMock(input),
    listOrganizations: () => listOrganizationsMock(),
    listUserInvitations: () => listUserInvitationsMock(),
    setActiveOrganization: (input: unknown) => setActiveOrganizationMock(input),
    useActiveOrganization: () => useActiveOrganizationMock(),
    useListOrganizations: () => useListOrganizationsMock(),
  },
}));

await import("@/routes/onboarding");

const onboardingRouteOptions = routeOptionsByPath.get("/onboarding");

if (!onboardingRouteOptions?.component) {
  throw new Error("Expected /onboarding route component to be registered");
}

const OnboardingComponent = onboardingRouteOptions.component as ComponentType;

const makeQueryResult = (data: unknown) => ({
  data,
  isPending: false,
  refetch: vi.fn().mockResolvedValue(null),
});

const resetRouteMocks = () => {
  vi.clearAllMocks();
  useListOrganizationsMock.mockReturnValue(makeQueryResult([]));
  useActiveOrganizationMock.mockReturnValue(makeQueryResult(null));
  useQueryMock.mockReturnValue(makeQueryResult([]));
};

const setDefaultLoaderSession = () => {
  loaderSessionState.value = {
    authenticated: true,
    payload: {
      user: {
        email: "owner@example.com",
        emailVerified: true,
      },
    },
    status: 200,
  };
};

const setDefaultOrganizationResponses = () => {
  listOrganizationsMock.mockResolvedValue({ data: [], error: null });
  activeOrganizationMock.mockResolvedValue({ data: null, error: null });
  listUserInvitationsMock.mockResolvedValue({ data: [], error: null });
  createOrganizationMock.mockResolvedValue({ data: null, error: null });
  setActiveOrganizationMock.mockResolvedValue({ data: null, error: null });
  acceptInvitationMock.mockResolvedValue({ data: null, error: null });
};

const setupOnboardingTestContext = () => {
  cleanup();
  resetRouteMocks();
  setDefaultLoaderSession();
  setDefaultOrganizationResponses();
};

describe("organization-onboarding helpers", () => {
  it("normalizes slug input to lowercase kebab-case", () => {
    setupOnboardingTestContext();
    expect(normalizeOrganizationSlug("  Acme   Product Team  ")).toBe("acme-product-team");
    expect(normalizeOrganizationSlug("ACME___HQ!!")).toBe("acme-hq");
  });

  it("falls back to organization name when slug input is blank", () => {
    setupOnboardingTestContext();
    expect(resolveCreateOrganizationSlug({ name: "Acme Space", slug: "   " })).toBe("acme-space");
    expect(resolveCreateOrganizationSlug({ name: "", slug: "   " })).toBe("");
  });

  it("filters pending invitations only", () => {
    setupOnboardingTestContext();
    const invitations = [
      { id: "inv_1", status: "pending" },
      { id: "inv_2", status: "accepted" },
      { id: "inv_3", status: "pending" },
      { id: "inv_4", status: "rejected" },
    ];

    expect(getPendingInvitations(invitations)).toStrictEqual([
      { id: "inv_1", status: "pending" },
      { id: "inv_3", status: "pending" },
    ]);
  });
});

describe("onboarding route actions", () => {
  it("shows empty onboarding states when the user has no organizations or invitations", () => {
    setupOnboardingTestContext();
    render(createElement(OnboardingComponent));

    expect(
      screen.getByText("No organizations yet. Create one or accept an invitation to continue."),
    ).toBeTruthy();
    expect(screen.getByText("No pending invitations.")).toBeTruthy();
  });

  it("wires create-organization action with trimmed and normalized payload", async () => {
    setupOnboardingTestContext();
    createOrganizationMock.mockResolvedValue({
      data: {
        id: "org_1",
        name: "Acme Labs",
        slug: "acme-team",
      },
      error: null,
    });

    render(createElement(OnboardingComponent));

    fireEvent.change(screen.getByLabelText("Organization name"), {
      target: { value: "  Acme Labs  " },
    });
    fireEvent.change(screen.getByLabelText("Organization slug"), {
      target: { value: " Acme__Team " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create organization" }));

    await waitFor(() => {
      expect(createOrganizationMock).toHaveBeenCalledWith({
        name: "Acme Labs",
        slug: "acme-team",
      });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        params: {
          slug: "acme-team",
        },
        to: "/org/$slug",
      });
    });
  });

  it("wires invitation acceptance with invitation id and org navigation", async () => {
    setupOnboardingTestContext();
    useQueryMock.mockReturnValue(
      makeQueryResult([
        {
          email: "invitee@example.com",
          id: "invitation_1",
          organizationName: "Invited Team",
          organizationSlug: "invited-team",
          role: "member",
          status: "pending",
        },
      ]),
    );

    acceptInvitationMock.mockResolvedValue({
      data: {
        id: "invitation_1",
      },
      error: null,
    });

    render(createElement(OnboardingComponent));
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));

    await waitFor(() => {
      expect(acceptInvitationMock).toHaveBeenCalledWith({
        invitationId: "invitation_1",
      });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        params: {
          slug: "invited-team",
        },
        to: "/org/$slug",
      });
    });
  });
});
