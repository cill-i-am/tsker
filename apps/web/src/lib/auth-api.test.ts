import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  acceptInvitationRequestMock,
  createOrganizationRequestMock,
  signInEmailRequestMock,
  signOutRequestMock,
  signUpEmailRequestMock,
  useActiveOrganizationRequestMock,
  useListOrganizationsRequestMock,
} = vi.hoisted(() => ({
  acceptInvitationRequestMock: vi.fn(),
  createOrganizationRequestMock: vi.fn(),
  signInEmailRequestMock: vi.fn(),
  signOutRequestMock: vi.fn(),
  signUpEmailRequestMock: vi.fn(),
  useActiveOrganizationRequestMock: vi.fn(),
  useListOrganizationsRequestMock: vi.fn(),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    acceptInvitation: acceptInvitationRequestMock,
    createOrganization: createOrganizationRequestMock,
    signIn: {
      email: signInEmailRequestMock,
    },
    signOut: signOutRequestMock,
    signUp: {
      email: signUpEmailRequestMock,
    },
    useActiveOrganization: useActiveOrganizationRequestMock,
    useListOrganizations: useListOrganizationsRequestMock,
    useSession: vi.fn(),
  })),
}));

import {
  authClient,
  signInEmail,
  signOut,
  signUpEmail,
  type AuthMutationResult,
} from "./auth-client";
import {
  signInEmail as signInEmailCompatibility,
  signOut as signOutCompatibility,
  signUpEmail as signUpEmailCompatibility,
} from "./auth-api";

describe("auth-client auth actions", () => {
  const organizationActionClient = authClient as typeof authClient & {
    acceptInvitation: (input: { invitationId: string }) => Promise<unknown>;
    createOrganization: (input: { name: string; slug: string }) => Promise<unknown>;
  };

  beforeEach(() => {
    createOrganizationRequestMock.mockReset();
    acceptInvitationRequestMock.mockReset();
    signUpEmailRequestMock.mockReset();
    signInEmailRequestMock.mockReset();
    signOutRequestMock.mockReset();
    useListOrganizationsRequestMock.mockReset();
    useActiveOrganizationRequestMock.mockReset();
  });

  it("maps successful sign-in to a 2xx-compatible result", async () => {
    signInEmailRequestMock.mockResolvedValueOnce({
      data: {
        email: "user@example.com",
      },
      error: null,
    });

    const result = await signInEmail({
      email: "user@example.com",
      password: "password123!",
    });

    expect(signInEmailRequestMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123!",
    });
    expect(result).toStrictEqual<AuthMutationResult>({
      body: {
        email: "user@example.com",
      },
      status: 200,
    });
  });

  it("maps Better Auth error responses to status/body", async () => {
    signUpEmailRequestMock.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Email already in use",
        status: 409,
      },
    });

    const result = await signUpEmail({
      email: "user@example.com",
      name: "Local User",
      password: "password123!",
    });

    expect(result).toStrictEqual<AuthMutationResult>({
      body: {
        message: "Email already in use",
        status: 409,
      },
      status: 409,
    });
  });

  it("maps sign-out responses", async () => {
    signOutRequestMock.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await signOut();

    expect(signOutRequestMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual<AuthMutationResult>({
      body: null,
      status: 200,
    });
  });

  it("wires create-organization action input through the auth client", async () => {
    createOrganizationRequestMock.mockResolvedValueOnce({
      data: {
        id: "org_1",
        name: "Acme",
        slug: "acme",
      },
      error: null,
    });

    const result = await organizationActionClient.createOrganization({
      name: "Acme",
      slug: "acme",
    });

    expect(createOrganizationRequestMock).toHaveBeenCalledWith({
      name: "Acme",
      slug: "acme",
    });
    expect(result).toEqual({
      data: {
        id: "org_1",
        name: "Acme",
        slug: "acme",
      },
      error: null,
    });
  });

  it("wires accept-invitation action input through the auth client", async () => {
    acceptInvitationRequestMock.mockResolvedValueOnce({
      data: {
        id: "inv_1",
      },
      error: null,
    });

    const result = await organizationActionClient.acceptInvitation({
      invitationId: "inv_1",
    });

    expect(acceptInvitationRequestMock).toHaveBeenCalledWith({
      invitationId: "inv_1",
    });
    expect(result).toEqual({
      data: {
        id: "inv_1",
      },
      error: null,
    });
  });

  it("exposes onboarding organization hooks from the auth client", () => {
    authClient.useListOrganizations();
    authClient.useActiveOrganization();

    expect(useListOrganizationsRequestMock).toHaveBeenCalledTimes(1);
    expect(useActiveOrganizationRequestMock).toHaveBeenCalledTimes(1);
  });
});

describe("auth-api compatibility layer", () => {
  it("re-exports auth actions from auth-client", () => {
    expect(signInEmailCompatibility).toBe(signInEmail);
    expect(signUpEmailCompatibility).toBe(signUpEmail);
    expect(signOutCompatibility).toBe(signOut);
  });
});
